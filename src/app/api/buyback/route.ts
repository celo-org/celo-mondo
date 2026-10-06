import { revalidateTag, unstable_cache } from 'next/cache';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { fetchDuneFeeRows, fetchLatestExecution } from 'src/features/buyback/fetchDuneResults';
import { BuybackStats } from 'src/features/buyback/types';
import { logger } from 'src/utils/logger';

// Run the handler on every request. A `revalidate` export only caches a GET
// handler that can be prerendered at build time, and a build without the Dune
// key answers 503, which Next refuses to prerender and so leaves the route
// uncached. What is shared across requests and server instances is the Data
// Cache: Dune responses by URL, and one last-good result.
export const dynamic = 'force-dynamic';

// How long a probe of the latest results (one row, a few datapoints) is kept.
// The query is re-executed once a day, so this bounds the delay between a
// refresh and the page showing it.
const PROBE_SECONDS = 5 * 60;
// A page of one execution's results never changes, so it is kept until long
// after the next daily execution has replaced it. A re-read of an execution,
// for any reason, then costs nothing.
const HISTORY_SECONDS = 7 * 24 * 60 * 60;

// Part of the last-good key. The Data Cache outlives a deployment and keys a
// cached function on its own source, not on what it imports, so a change to
// the computation or the row schema would otherwise keep serving figures
// produced by the previous code.
const DEPLOYMENT = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local';
const LAST_GOOD_TAG = `buyback-last-good-${DEPLOYMENT}`;

/** The configured Dune key, or undefined when it is unset or blank. */
function getDuneApiKey(): string | undefined {
  return process.env.DUNE_API_KEY?.trim() || undefined;
}

/**
 * The current figures: the execution Dune currently serves, its history, and
 * the P&L. Every Dune response comes through the Data Cache, so a request
 * costs Dune nothing unless the probe is older than five minutes or the
 * execution is new, and a request failure part-way leaves the pages that did
 * succeed in place. The computation itself is cheap and runs per request,
 * which keeps this a plain function: Next does not cache a cached function
 * called from inside another one.
 */
async function computeFreshStats(): Promise<BuybackStats> {
  const apiKey = getDuneApiKey();
  if (!apiKey) throw new Error('DUNE_API_KEY not configured');

  const latest = await fetchLatestExecution(apiKey, undefined, { cacheSeconds: PROBE_SECONDS });
  const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows(
    apiKey,
    undefined,
    latest.executionId,
    { cacheSeconds: HISTORY_SECONDS },
  );
  logger.debug(`Buyback stats computed from ${rows.length} daily rows of ${latest.executionId}`);
  return computeBuybackStats(rows, { executionStartedAt, executionEndedAt });
}

/**
 * The last figures that were served, kept without expiry so that an outage
 * or an unusable new execution shows them instead of an error. Refreshed by
 * tag, and re-materialized at once, whenever a fresh computation produced
 * something different. Their age stays visible: `updatedAt` is Dune's
 * execution time and the page flags data that has gone stale.
 */
const getLastGoodStats = unstable_cache(computeFreshStats, ['buyback-last-good', DEPLOYMENT], {
  revalidate: false,
  tags: [LAST_GOOD_TAG],
});

/**
 * Make the last-good entry follow a fresh result that differs from it. The
 * old entry is dropped and the new one materialized in the same request, so
 * there is never a moment without a fallback.
 */
async function rememberAsLastGood(stats: BuybackStats): Promise<void> {
  const stored = await getLastGoodStats().catch(() => null);
  if (stored !== null && stored.updatedAt === stats.updatedAt) return;
  revalidateTag(LAST_GOOD_TAG);
  await getLastGoodStats().catch((error: unknown) => {
    logger.warn('Buyback stats: could not materialize the new last-good entry', error);
  });
}

export async function GET() {
  if (!getDuneApiKey()) {
    logger.warn('Buyback stats requested but DUNE_API_KEY is not configured');
    return new Response('DUNE_API_KEY not configured', { status: 503 });
  }

  logger.debug('Buyback stats request received');
  try {
    const stats = await computeFreshStats();
    await rememberAsLastGood(stats);
    return Response.json(stats);
  } catch (error) {
    // Keep Dune's response out of the public body; the detail is in the log.
    logger.error('Buyback stats error', error);
    const lastGood = await getLastGoodStats().catch(() => null);
    if (lastGood !== null) {
      logger.warn(`Buyback stats: serving the last good figures (${lastGood.updatedAt})`);
      return Response.json(lastGood);
    }
    return new Response('Unable to load buyback stats', { status: 500 });
  }
}
