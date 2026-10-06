import { unstable_cache } from 'next/cache';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import {
  DuneRequestError,
  fetchDuneFeeRows,
  fetchLatestExecution,
} from 'src/features/buyback/fetchDuneResults';
import { BuybackStats } from 'src/features/buyback/types';
import { logger } from 'src/utils/logger';
import { errorToString } from 'src/utils/strings';

// Run the handler on every request. A `revalidate` export only caches a GET
// handler that can be prerendered at build time, and a build without the Dune
// key answers 503, which Next refuses to prerender and so leaves the route
// uncached. The shared caches are the explicit data caches below instead.
export const dynamic = 'force-dynamic';

// How often to ask Dune (one row, a few datapoints) whether a new execution
// has landed. The query is re-executed once a day, so this bounds the delay
// between a refresh and the page showing it.
const PROBE_SECONDS = 15 * 60;
// A history read for one execution never changes, so it is kept until long
// after the next daily execution has replaced it.
const HISTORY_SECONDS = 7 * 24 * 60 * 60;
// How long to remember that an execution's results failed validation before
// trying it again. Every attempt pages through Dune, so page traffic must not
// turn one bad execution into a stream of billed reads. Only validation
// failures are remembered this long: an execution's results never change, so
// neither does that verdict.
const VERDICT_SECONDS = 60 * 60;
// How long to remember a failed request (timeout, 429, 5xx) before asking
// Dune again. Such a failure says nothing about the execution, so it is
// retried soon, but not on every request: while Dune is down, each attempt
// re-downloads every page that did succeed.
const TRANSIENT_SECONDS = 5 * 60;
// Attempts are keyed by the time bucket they fall in rather than refreshed
// in the background: an entry answers every request in its bucket, including
// with a remembered failure, and the next bucket starts afresh. A background
// refresh would hand the served-stats revalidation an old answer first and
// delay a new execution by one more cycle.
const bucketOf = (now: number) => String(Math.floor(now / (TRANSIENT_SECONDS * 1000)));

// Part of every cache key. The Data Cache outlives a deployment and keys on
// the cached function's own source, not on what it imports, so a change to the
// computation or the row schema would otherwise keep serving figures produced
// by the previous code until the week-long entry expired.
const DEPLOYMENT = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local';

/** A deterministic verdict on an execution: its figures, or why they are unusable. */
type HistoryVerdict = { stats: BuybackStats } | { failure: string };
/** What an attempt produced: a verdict, or a request failure to retry soon. */
type Attempt<T> = T | { transient: string };

/** The configured Dune key, or undefined when it is unset or blank. */
function getDuneApiKey(): string {
  const apiKey = process.env.DUNE_API_KEY?.trim();
  if (!apiKey) throw new Error('DUNE_API_KEY not configured');
  return apiKey;
}

/** Catch a failed request into a value that can be cached for a short while. */
async function attempt<T>(run: () => Promise<T>, what: string): Promise<Attempt<T>> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof DuneRequestError)) throw error;
    logger.warn(`Buyback stats: ${what} failed, will retry in ${TRANSIENT_SECONDS}s`, error);
    return { transient: errorToString(error) };
  }
}

/**
 * The full history of one execution plus the P&L computation. Keyed by the
 * execution id, so Dune is paged through once per daily execution rather than
 * once per cache expiry.
 */
const getStatsForExecution = unstable_cache(
  async (executionId: string): Promise<BuybackStats> => {
    const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows(
      getDuneApiKey(),
      undefined,
      executionId,
    );
    logger.debug(`Buyback stats computed from ${rows.length} daily rows of ${executionId}`);
    return computeBuybackStats(rows, { executionStartedAt, executionEndedAt });
  },
  ['buyback-stats', DEPLOYMENT],
  { revalidate: HISTORY_SECONDS },
);

/**
 * The verdict on an execution, validation failures included. A thrown read is
 * never cached, so without this every request would retry an unusable
 * execution; here that verdict is remembered for an hour, and a success is
 * served from the week-long history cache underneath. Request failures are
 * rethrown: they are not a verdict.
 */
const getHistoryVerdict = unstable_cache(
  async (executionId: string): Promise<HistoryVerdict> => {
    try {
      return { stats: await getStatsForExecution(executionId) };
    } catch (error) {
      if (error instanceof DuneRequestError) throw error;
      logger.error(`Buyback stats: Dune execution ${executionId} is unusable`, error);
      return { failure: errorToString(error) };
    }
  },
  ['buyback-history-verdict', DEPLOYMENT],
  { revalidate: VERDICT_SECONDS },
);

/** One attempt at the verdict per time bucket while requests to Dune fail. */
const getHistoryOutcome = unstable_cache(
  (executionId: string, bucket: string) =>
    attempt(
      () => getHistoryVerdict(executionId),
      `reading execution ${executionId} (bucket ${bucket})`,
    ),
  ['buyback-history-attempt', DEPLOYMENT],
  { revalidate: TRANSIENT_SECONDS },
);

/** One probe per time bucket for the execution Dune currently serves. */
const getLatestExecutionOutcome = unstable_cache(
  (bucket: string) =>
    attempt(
      () => fetchLatestExecution(getDuneApiKey()),
      `probing the latest execution (bucket ${bucket})`,
    ),
  ['buyback-probe-attempt', DEPLOYMENT],
  { revalidate: TRANSIENT_SECONDS },
);

/**
 * The stats to serve: a cheap one-row probe for the execution Dune currently
 * serves, then that execution's stats. Cached across requests and server
 * instances, so page visits and React Query refetches share one probe.
 *
 * A failure is never stored here. With nothing cached yet it surfaces as an
 * error; once an entry exists, Next serves it while refreshing in the
 * background and keeps it if that refresh fails. A new execution therefore
 * replaces the served figures only once its history has been read and
 * validated; if it cannot be, the last good figures stay up. Their age stays
 * visible: `updatedAt` is Dune's execution time and the page flags data that
 * has gone stale.
 */
const getServedStats = unstable_cache(
  async (): Promise<BuybackStats> => {
    const bucket = bucketOf(Date.now());
    const probe = await getLatestExecutionOutcome(bucket);
    if ('transient' in probe) throw new Error(`Dune probe failed: ${probe.transient}`);
    const outcome = await getHistoryOutcome(probe.executionId, bucket);
    if ('transient' in outcome) {
      throw new Error(
        `Dune execution ${probe.executionId} could not be read: ${outcome.transient}`,
      );
    }
    if ('failure' in outcome) {
      throw new Error(`Dune execution ${probe.executionId} is unusable: ${outcome.failure}`);
    }
    return outcome.stats;
  },
  ['buyback-served-stats', DEPLOYMENT],
  { revalidate: PROBE_SECONDS },
);

export async function GET() {
  if (!process.env.DUNE_API_KEY?.trim()) {
    logger.warn('Buyback stats requested but DUNE_API_KEY is not configured');
    return new Response('DUNE_API_KEY not configured', { status: 503 });
  }

  try {
    logger.debug('Buyback stats request received');
    return Response.json(await getServedStats());
  } catch (error) {
    // Keep Dune's response out of the public body; the detail is in the log.
    logger.error('Buyback stats error', error);
    return new Response('Unable to load buyback stats', { status: 500 });
  }
}
