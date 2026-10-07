import 'dotenv/config';

/* eslint no-console: 0 */
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from 'src/db/schema';
import { buybackStatsTable } from 'src/db/schema';
import {
  computeBuybackStats,
  parseUtcTimestamp,
  usableExecutionStart,
} from 'src/features/buyback/computeStats';
import {
  DuneWaitTimeoutError,
  executeDuneQuery,
  ExecutionOutcome,
  waitForExecution,
} from 'src/features/buyback/duneExecution';
import {
  CELO_PNL_QUERY_ID,
  COMPLETED_STATE,
  DuneExecution,
  DuneRequestError,
  fetchDuneFeeRows,
  fetchLatestExecution,
  PENDING_STATES,
} from 'src/features/buyback/fetchDuneResults';
import { readSettledTransfers } from 'src/features/buyback/settledTransfers';
import { BuybackStats, SettledTransfers } from 'src/features/buyback/types';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

/**
 * Daily refresh of the /buyback dashboard, run by the refresh-buyback-stats
 * GitHub Actions workflow: execute the Dune P&L query (unless Dune already
 * has a fresh enough execution), read and validate its results, compute the
 * figures and store them, one row per execution, for /api/buyback to serve.
 * The app itself never talks to Dune.
 */

// Time of the scheduled run; must match the cron in
// .github/workflows/refresh-buyback-stats.yml. The previous UTC day is
// complete and Dune's ingestion has caught up by then, so an execution from
// earlier in the day may hold a half-ingested day and does not count as the
// day's refresh.
export const REFRESH_TIME_UTC = '05:30:00';
// An execution started this soon before a manual run is the same refresh
// (two runs queued together), not one to repeat. A manual run never counts
// as the day's refresh: the scheduled rule below is what guards against a
// half-ingested day, and the next scheduled run catches up if one is missed.
export const RECENT_SECONDS = 30 * 60;
// Dune's clock and the runner's may disagree by a little, so an execution
// that started "a few seconds from now" is a real one that just started.
// Further ahead than this it is a glitch that must not suppress the refresh.
const CLOCK_SKEW_SECONDS = 5 * 60;

/** Either database driver the stats can be stored in (postgres-js live, PGlite in tests). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface RefreshContext {
  /** Whether this is the scheduled daily run, as opposed to a manual dispatch. */
  scheduled: boolean;
  /** Execute even if Dune ran the query recently or already today. */
  force: boolean;
  now: Date;
}

/**
 * What to do about the execution Dune currently serves. Every execution is
 * billed, so one that makes a new run pointless is used instead: one still
 * running, or one completed today at or after the scheduled time (and, for
 * a manual run, one completed less than half an hour ago). A run that
 * started before the scheduled time is waited for, so two executions never
 * overlap, but then replaced by the day's refresh.
 */
export type RefreshPlan =
  | { kind: 'execute'; reason: string }
  | { kind: 'use'; executionId: string; reason: string }
  | { kind: 'await'; executionId: string; latest: DuneExecution; reason: string }
  | { kind: 'await-then-execute'; executionId: string; latest: DuneExecution; reason: string };

export function planRefresh(
  latest: DuneExecution | null,
  { scheduled, force, now }: RefreshContext,
): RefreshPlan {
  if (force) return { kind: 'execute', reason: 'forced' };
  if (latest === null) {
    return { kind: 'execute', reason: 'the latest execution could not be read' };
  }
  const { executionId, state } = latest;
  const pending = PENDING_STATES.has(state);
  // Dune's own timestamp decides: the start of the execution, or, for one
  // still pending (waiting for a slot, so not started yet), its submission.
  const reference = pending
    ? (latest.executionStartedAt ?? latest.submittedAt)
    : latest.executionStartedAt;
  const referenceTime = parseUtcTimestamp(reference);
  const rawAgeSeconds =
    referenceTime === null ? Number.NaN : (now.getTime() - referenceTime.getTime()) / 1000;
  // A timestamp that is malformed, missing or from the future (a clock or
  // metadata glitch) must not stand in for a real execution: a completed
  // one is not reused on its strength. A pending one is simply waited for;
  // the wait is bounded and replaces it if it never finishes.
  if (referenceTime === null || rawAgeSeconds < -CLOCK_SKEW_SECONDS) {
    if (pending) {
      return {
        kind: 'await',
        executionId,
        latest,
        reason: `Dune is already running the query (execution ${executionId}, ${state}, timestamp ${reference ?? 'missing'})`,
      };
    }
    return {
      kind: 'execute',
      reason:
        referenceTime === null
          ? `execution ${executionId} has no usable start time`
          : `Dune reports an execution started in the future (${reference})`,
    };
  }
  const ageSeconds = Math.max(0, rawAgeSeconds);
  const referenceIso = referenceTime.toISOString();
  const afterTodaysRefresh =
    referenceIso.slice(0, 10) === now.toISOString().slice(0, 10) &&
    referenceIso.slice(11, 19) >= REFRESH_TIME_UTC;
  const recent = ageSeconds < RECENT_SECONDS;

  if (pending) {
    if (!recent) {
      return {
        kind: 'execute',
        reason: `execution ${executionId} has been ${state} since ${reference} and looks stuck`,
      };
    }
    if (afterTodaysRefresh || !scheduled) {
      return {
        kind: 'await',
        executionId,
        latest,
        reason: `Dune is already running the query (execution ${executionId}, ${state} since ${reference})`,
      };
    }
    return {
      kind: 'await-then-execute',
      executionId,
      latest,
      reason: `execution ${executionId} has been ${state} since ${reference}, before today's refresh time`,
    };
  }
  if (state === COMPLETED_STATE) {
    if (afterTodaysRefresh) {
      return {
        kind: 'use',
        executionId,
        reason: `Dune already executed the query today at ${reference}, after the scheduled time`,
      };
    }
    if (!scheduled && recent) {
      return {
        kind: 'use',
        executionId,
        reason: `Dune executed the query at ${reference}, less than ${RECENT_SECONDS}s ago (set force to run anyway)`,
      };
    }
    return {
      kind: 'execute',
      reason: `the latest execution (${executionId}) started ${reference}`,
    };
  }
  return { kind: 'execute', reason: `the latest execution (${executionId}) ended as ${state}` };
}

/**
 * The timestamps a finished execution reports, in the probe's shape; where the
 * status omits one, what the probe reported stands.
 */
function timestampsOf(outcome: ExecutionOutcome, probed: DuneExecution) {
  return {
    executionStartedAt: outcome.executionStartedAt ?? probed.executionStartedAt,
    executionEndedAt: outcome.executionEndedAt ?? probed.executionEndedAt,
  };
}

export interface RefreshOptions extends Omit<RefreshContext, 'now'> {
  apiKey: string;
  /**
   * The current time, read when planning and again when computing: a wait
   * for an execution can take minutes, and the new execution's timestamps
   * must be judged against the time they are read, not the time the run
   * started. Injectable for tests.
   */
  clock?: () => Date;
  /** Every database the figures are stored in; the app serves the newest row. */
  databases: Database[];
  queryId?: number;
  log?: (message: string) => void;
  /** How often to poll a running execution, and for how long; shortened by tests. */
  pollIntervalMs?: number;
  waitTimeoutMs?: number;
  /**
   * Reads what the chain says has reached the Community Fund. Absent when no
   * node is configured (a local run); the stored figures then carry no
   * settled amount rather than a wrong one.
   */
  readSettled?: () => Promise<SettledTransfers>;
}

/**
 * Run the refresh: settle on a completed execution (see `planRefresh`), read
 * and validate its whole history, compute the figures and store them in every
 * database. Any failure throws before anything is stored, so the app keeps
 * serving the previous figures, whose age the page shows.
 */
export async function refreshBuybackStats({
  apiKey,
  databases,
  queryId = CELO_PNL_QUERY_ID,
  log = console.log,
  pollIntervalMs,
  waitTimeoutMs,
  clock = () => new Date(),
  readSettled,
  scheduled,
  force,
}: RefreshOptions): Promise<BuybackStats> {
  if (databases.length === 0) throw new Error('No database to store the stats in');
  // If the probe itself fails there is nothing to stand down for: execute.
  const latest = await fetchLatestExecution(apiKey, queryId).catch((error: unknown) => {
    if (!(error instanceof DuneRequestError)) throw error;
    log(`Could not read the latest execution: ${error.message}`);
    return null;
  });
  const plan = planRefresh(latest, { scheduled, force, now: clock() });
  log(`Plan: ${plan.kind} (${plan.reason})`);

  const waitOptions = { pollIntervalMs, timeoutMs: waitTimeoutMs, log };
  const executeAndWait = async () => {
    const executionId = await executeDuneQuery(apiKey, queryId);
    log(`Dune execution ${executionId} started`);
    // Our own execution running out the clock fails the run: there is
    // nothing better to do than report it.
    const outcome = await waitForExecution(apiKey, executionId, waitOptions);
    if (!outcome.completed) {
      throw new Error(`Dune execution ${executionId} ended with state ${outcome.state}`);
    }
    log(`Dune execution ${executionId} completed`);
    return executionId;
  };
  // Wait for an execution started elsewhere. One that runs out the clock is
  // treated like one that failed, with the reason logged, so that the day's
  // refresh is not skipped because of a run that was stuck before it began.
  const awaitExisting = async (executionId: string): Promise<ExecutionOutcome | null> => {
    try {
      const outcome = await waitForExecution(apiKey, executionId, waitOptions);
      if (!outcome.completed) {
        log(`Dune execution ${executionId} ended with state ${outcome.state}; executing`);
      }
      return outcome;
    } catch (error) {
      if (!(error instanceof DuneWaitTimeoutError)) throw error;
      log(`${error.message}; executing`);
      return null;
    }
  };
  let executionId: string;
  switch (plan.kind) {
    case 'use':
      executionId = plan.executionId;
      break;
    case 'await': {
      const outcome = await awaitExisting(plan.executionId);
      // A scheduled run may only use the execution if its completion status
      // shows it started at or after the refresh time; one awaited without a
      // usable timestamp could have started before it. A manual run queued
      // behind an execution uses it regardless, as it planned to.
      const again =
        outcome?.completed && scheduled
          ? planRefresh(
              { ...plan.latest, state: outcome.state, ...timestampsOf(outcome, plan.latest) },
              { scheduled, force, now: clock() },
            )
          : null;
      if (outcome?.completed && (!scheduled || again?.kind === 'use')) {
        executionId = plan.executionId;
      } else {
        if (again) log(`Dune execution ${plan.executionId}: ${again.reason}; executing`);
        executionId = await executeAndWait();
      }
      break;
    }
    case 'await-then-execute': {
      const outcome = await awaitExisting(plan.executionId);
      // A queued execution starts later than it was submitted. If Dune only
      // started it after the refresh time, its snapshot is the day's and a
      // second billed execution would add nothing: plan again on what the
      // wait learned.
      const started = outcome?.completed
        ? planRefresh(
            { ...plan.latest, state: outcome.state, ...timestampsOf(outcome, plan.latest) },
            { scheduled, force, now: clock() },
          )
        : null;
      if (started?.kind === 'use') {
        log(
          `Dune execution ${plan.executionId} started at ${outcome?.executionStartedAt}, after the refresh time; using it`,
        );
        executionId = plan.executionId;
      } else {
        if (outcome?.completed) log(`Dune execution ${plan.executionId} completed; executing`);
        executionId = await executeAndWait();
      }
      break;
    }
    case 'execute':
      executionId = await executeAndWait();
      break;
  }

  const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows(
    apiKey,
    queryId,
    executionId,
  );
  // A node failure fails the run like a Dune failure: the previous row, with
  // its own settled figure, keeps being served rather than a mixed one.
  const settled = readSettled ? await readSettled() : null;
  if (settled) {
    log(
      `Settled on chain: ${settled.celo.toFixed(2)} CELO in ${settled.transfers} transfers through block ${settled.throughBlock}`,
    );
  } else {
    log('On-chain transfers not read (no node configured)');
  }
  const timing = { executionStartedAt, executionEndedAt, now: clock() };
  const stats = computeBuybackStats(rows, { ...timing, settled });
  log(
    `Computed stats from ${rows.length} daily rows of execution ${executionId}: ` +
      `${stats.sinceDay} to ${stats.latestDay}, ${stats.totals.celoToCommunityFund.toFixed(0)} CELO accrued`,
  );
  await storeStats(
    databases,
    {
      executionId,
      // Snapshots are ordered by when they were taken; without a usable
      // start time the execution's own freshness timestamp stands in.
      startedAt: usableExecutionStart(timing) ?? stats.updatedAt,
      executedAt: stats.updatedAt,
      stats,
    },
    log,
  );
  return stats;
}

/**
 * Store the figures in every database, replacing an earlier row of the same
 * execution (a recomputation after a code change). Each database is tried,
 * so one being down does not keep the others stale, and the run then fails
 * so the outage is seen.
 */
async function storeStats(
  databases: Database[],
  row: typeof buybackStatsTable.$inferInsert,
  log: (message: string) => void,
): Promise<void> {
  let failures = 0;
  for (const [index, database] of databases.entries()) {
    const name = `database ${index + 1} of ${databases.length}`;
    try {
      await database
        .insert(buybackStatsTable)
        .values(row)
        .onConflictDoUpdate({
          target: buybackStatsTable.executionId,
          set: {
            startedAt: row.startedAt,
            executedAt: row.executedAt,
            stats: row.stats,
            computedAt: new Date().toISOString(),
          },
        });
      log(`Stored the stats of execution ${row.executionId} in ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`Storing the stats in ${name} failed:`, error);
    }
  }
  if (failures > 0) {
    throw new Error(`Storing the stats failed for ${failures} of ${databases.length} databases`);
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.DUNE_API_KEY?.trim();
  if (!apiKey) throw new Error('DUNE_API_KEY is not set');
  // Production is required, so a missing secret fails the run instead of
  // quietly refreshing staging alone; staging is optional for local runs.
  const production = process.env.POSTGRES_URL?.trim();
  if (!production) throw new Error('POSTGRES_URL is not set');
  const staging = process.env.POSTGRES_URL_STAGING?.trim();
  const urls = staging ? [production, staging] : [production];
  // The archive node is required in CI (the workflow checks the secret) and
  // optional locally. Never fall back to a public node: its log range cap
  // would fail every scan.
  const node = process.env.PRIVATE_NO_RATE_LIMITED_NODE?.trim();
  if (!node)
    console.warn('PRIVATE_NO_RATE_LIMITED_NODE is not set; on-chain transfers will not be read');
  const readSettled = node
    ? () =>
        readSettledTransfers(
          // A million-block log query can take a while; viem's default
          // timeout of ten seconds would fail the run on a slow chunk.
          createPublicClient({
            chain: celo,
            transport: http(node, { timeout: 60_000 }),
          }) as PublicClient<Transport, Chain>,
        )
    : undefined;

  // Disable prefetch as it is not supported for "Transaction" pool mode
  const clients = urls.map((url) => postgres(url, { prepare: false }));
  try {
    await refreshBuybackStats({
      apiKey,
      databases: clients.map((client) => drizzle({ client, schema })),
      scheduled: process.env.GITHUB_EVENT_NAME === 'schedule',
      force: process.env.FORCE === 'true',
      readSettled,
    });
  } finally {
    await Promise.all(clients.map((client) => client.end()));
  }
}

// Run the script when executed directly
if (process.argv[1]?.endsWith('refreshBuybackStats.ts')) {
  main()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
