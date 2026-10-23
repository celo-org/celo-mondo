/* eslint no-console: 0 */
import { governanceABI } from '@celo/abis';
import { and, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import {
  EXECUTION_STAGE_EXPIRY_TIME,
  QUEUED_STAGE_EXPIRY_TIME,
  REFERENDUM_STAGE_EXPIRY_TIME,
} from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import {
  fetchGovernanceRepoStatus,
  GovernanceStatusUpdate,
  triggerGovernanceRepoStatusUpdate,
} from 'src/features/governance/syncGovernanceRepoStatus';
import { ProposalMetadataStatus, ProposalStage } from 'src/features/governance/types';
import { celoPublicClient } from 'src/utils/client';
import { unixTimestampToISOString } from 'src/utils/time';
import { celo } from 'viem/chains';

const HOUR_MS = 60 * 60 * 1000;
// A proposal settles within ten days of being dequeued, so a month covers every
// recent outcome and leaves weeks of daily retries for a dispatch that failed.
const LOOKBACK_MS = 30 * 24 * HOUR_MS;
// The execution event reaches the database on the hourly backfill. Until it has
// had time to land, an executed proposal still looks expired here.
const SETTLE_MS = 6 * HOUR_MS;
// The hourly backfill keeps retrying proposals that have events but no row. One
// still without a row after a day has no CGP metadata and never will.
const ORPHAN_STALE_MS = 24 * HOUR_MS;

// Adopted (a zero-transaction proposal that passed) has no counterpart in the
// governance repo: its only successful status, EXECUTED, is validated there against
// a ProposalExecuted event that such a proposal never emits.
const STAGE_TO_STATUS: Partial<Record<ProposalStage, ProposalMetadataStatus>> = {
  [ProposalStage.Executed]: ProposalMetadataStatus.EXECUTED,
  [ProposalStage.Expiration]: ProposalMetadataStatus.EXPIRED,
  [ProposalStage.Rejected]: ProposalMetadataStatus.REJECTED,
};

interface SettledProposal {
  id: number;
  cgp: number;
  stage: ProposalStage;
  executedAt: string | null;
}

/**
 * Pushes the outcome of recently settled proposals to the governance repository.
 * Meant to run against the production database.
 *
 * Reads the status each CGP currently carries there and dispatches an update only
 * when it differs, so the daily run is idempotent and a failed dispatch is simply
 * retried the next day.
 */
export async function reconcileGovernanceRepoStatus(now = new Date()): Promise<void> {
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();
  const settledBefore = new Date(
    now.getTime() - REFERENDUM_STAGE_EXPIRY_TIME - EXECUTION_STAGE_EXPIRY_TIME - SETTLE_MS,
  ).toISOString();

  // A row whose dequeue time never got written (the backfill died between the event
  // and the row update) is anchored at the latest moment it could have left the queue,
  // and a row created from its execution event alone at the execution itself.
  const dequeuedBy = sql`coalesce(${proposalsTable.dequeuedAt}, ${proposalsTable.queuedAt} + ${QUEUED_STAGE_EXPIRY_TIME / 1000} * interval '1 second', ${proposalsTable.executedAt})`;

  const proposals: SettledProposal[] = await database
    .select({
      id: proposalsTable.id,
      cgp: proposalsTable.cgp,
      stage: proposalsTable.stage,
      executedAt: proposalsTable.executedAt,
    })
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, celo.id),
        gte(dequeuedBy, since),
        or(
          eq(proposalsTable.stage, ProposalStage.Executed),
          and(
            inArray(proposalsTable.stage, [ProposalStage.Expiration, ProposalStage.Rejected]),
            lte(dequeuedBy, settledBefore),
          ),
        ),
      ),
    );

  console.log(`Found ${proposals.length} settled proposals dequeued since ${since}`);
  if (proposals.length === 0) return;

  const oldestId = Math.min(...proposals.map((p) => p.id));

  // One snapshot of every imported proposal from the oldest candidate on. The
  // current attempt per CGP and the set of known ids come from the same rows, so a
  // backfill inserting a resubmission mid-run cannot split the two views.
  const imported = await database
    .select({ id: proposalsTable.id, cgp: proposalsTable.cgp })
    .from(proposalsTable)
    .where(and(eq(proposalsTable.chainId, celo.id), gte(proposalsTable.id, oldestId)));
  // A resubmitted CGP keeps its earlier attempts in the table, chained by ascending
  // id, so only the highest id for a CGP may speak for it. If that attempt is still
  // running, an earlier outcome must not be reported either.
  const currentAttempts = new Map<number, number>();
  for (const row of imported) {
    currentAttempts.set(row.cgp, Math.max(currentAttempts.get(row.cgp) ?? 0, row.id));
  }

  // Proposals the backfill saw queued but never turned into a row. A stale one has no
  // metadata and cannot name a CGP; a fresh one may still be on its way in.
  const queuedId = sql`(${eventsTable.args}->>'proposalId')::bigint`;
  const staleBefore = new Date(now.getTime() - ORPHAN_STALE_MS).toISOString();
  const orphans = await database
    .select({
      id: queuedId.mapWith(Number),
      stale:
        sql`min(${eventsTable.ingestedAt}) is null or min(${eventsTable.ingestedAt}) < ${staleBefore}::timestamptz`.mapWith(
          Boolean,
        ),
    })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.chainId, celo.id),
        eq(eventsTable.eventName, 'ProposalQueued'),
        gte(queuedId, oldestId),
      ),
    )
    .groupBy(queuedId);

  const chain = new ChainLookup(
    new Set(imported.map((row) => row.id)),
    new Map(orphans.map((row) => [row.id, row.stale])),
  );

  for (const proposal of proposals) {
    const status = STAGE_TO_STATUS[proposal.stage];
    if (!status) continue;
    if (currentAttempts.get(proposal.cgp) !== proposal.id) {
      console.log(`Proposal ${proposal.id} is an earlier attempt of CGP ${proposal.cgp}, skipping`);
      continue;
    }

    try {
      const current = await fetchGovernanceRepoStatus(proposal.cgp);
      if (current === null) continue;
      // A resubmission can end the same way as its predecessor, so the file is only
      // settled when it names this attempt as well.
      if (current.status === status && current.proposalId === proposal.id) continue;
      if (
        current.status === ProposalMetadataStatus.EXECUTED &&
        status !== ProposalMetadataStatus.EXECUTED
      ) {
        console.log(`⚠️  CGP ${proposal.cgp} is executed in the governance repo, leaving it alone`);
        continue;
      }
      if (current.proposalId !== null && current.proposalId > proposal.id) {
        console.log(
          `CGP ${proposal.cgp} already points at proposal ${current.proposalId}, skipping`,
        );
        continue;
      }
      // The hourly backfill may not have imported a resubmission yet, so ask the chain.
      const newer = await chain.newerAttempt(proposal.cgp, proposal.id);
      if (newer === 'resubmitted') {
        console.log(`CGP ${proposal.cgp} has a newer attempt on chain, skipping`);
        continue;
      }
      if (newer === 'unknown') {
        console.log(`Proposal ${proposal.id}: a newer proposal is not imported yet, waiting`);
        continue;
      }

      const update = await toUpdate(proposal, status);
      if (!update) {
        console.log(`⚠️  Proposal ${proposal.id} is executed without an execution event, skipping`);
        continue;
      }
      await triggerGovernanceRepoStatusUpdate(update);
    } catch (error) {
      // Leave it for the next run rather than stopping the loop.
      console.error(`❌ Could not reconcile proposal ${proposal.id}:`, error);
    }
  }
}

async function toUpdate(
  proposal: SettledProposal,
  status: ProposalMetadataStatus,
): Promise<GovernanceStatusUpdate | null> {
  const base = { cgpNumber: proposal.cgp, onchainId: proposal.id };
  if (status === ProposalMetadataStatus.EXECUTED) {
    const executedAt = proposal.executedAt ?? (await executedAtFromEvent(proposal.id));
    return executedAt ? { ...base, status, executedAt } : null;
  }
  if (status === ProposalMetadataStatus.EXPIRED || status === ProposalMetadataStatus.REJECTED) {
    return { ...base, status };
  }
  return null;
}

/**
 * A backfill that stored the ProposalExecuted event but died before updating the
 * proposal row leaves the stage at Executed with no execution time. The event's
 * block still tells when it happened.
 */
async function executedAtFromEvent(proposalId: number): Promise<string | null> {
  const [event] = await database
    .select({ blockNumber: eventsTable.blockNumber })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.chainId, celo.id),
        eq(eventsTable.eventName, 'ProposalExecuted'),
        eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, BigInt(proposalId)),
      ),
    )
    .limit(1);
  if (!event) return null;
  const block = await celoPublicClient.getBlock({ blockNumber: event.blockNumber });
  return unixTimestampToISOString(Number(block.timestamp));
}

/**
 * Reads the proposal counter, queue and dequeue once per run and description URLs
 * on demand, to spot a resubmission the backfill has not imported yet.
 */
class ChainLookup {
  private state: Promise<{ count: bigint; live: Set<bigint> }> | null = null;
  private cgpById = new Map<bigint, Promise<number>>();

  constructor(
    private importedIds: Set<number>,
    /** Queued proposals without a row, by id, and whether the backfill has given up on them. */
    private orphans: Map<number, boolean>,
  ) {}

  /**
   * 'resubmitted' when a newer live proposal names the same CGP, 'unknown' when a
   * newer proposal is neither imported nor live and the backfill has not had its day
   * with it (nothing here can tell its CGP yet), 'none' otherwise.
   */
  async newerAttempt(cgp: number, afterId: number): Promise<'none' | 'resubmitted' | 'unknown'> {
    this.state ??= this.fetchState();
    const { count, live } = await this.state;
    for (let id = BigInt(afterId) + 1n; id <= count; id++) {
      if (this.importedIds.has(Number(id))) continue;
      if (live.has(id)) {
        this.cgpById.set(id, this.cgpById.get(id) ?? this.fetchCgp(id));
        if ((await this.cgpById.get(id)) === cgp) return 'resubmitted';
        continue;
      }
      if (this.orphans.get(Number(id)) === true) continue;
      return 'unknown';
    }
    return 'none';
  }

  private async fetchState() {
    const governance = { address: Addresses.Governance, abi: governanceABI } as const;
    const [count, [queued], dequeued] = await Promise.all([
      celoPublicClient.readContract({ ...governance, functionName: 'proposalCount' }),
      celoPublicClient.readContract({ ...governance, functionName: 'getQueue' }),
      celoPublicClient.readContract({ ...governance, functionName: 'getDequeue' }),
    ]);
    return { count, live: new Set([...queued, ...dequeued]) };
  }

  private async fetchCgp(id: bigint): Promise<number> {
    const [, , , , descriptionUrl] = await celoPublicClient.readContract({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getProposal',
      args: [id],
    });
    return parseInt(descriptionUrl.match(/cgp-(\d+)\.md/i)?.[1] ?? '0', 10);
  }
}
