import { unstable_cache } from 'next/cache';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { fetchDuneFeeRows, fetchLatestExecution } from 'src/features/buyback/fetchDuneResults';
import { BuybackStats } from 'src/features/buyback/types';
import { logger } from 'src/utils/logger';

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

/** The configured Dune key, or undefined when it is unset or blank. */
function getDuneApiKey(): string | undefined {
  return process.env.DUNE_API_KEY?.trim() || undefined;
}

/**
 * Which execution Dune currently serves, cached across requests and server
 * instances, so page visits and React Query refetches share one cheap probe.
 *
 * A failed probe is never stored. With nothing cached yet it surfaces as an
 * error; once an entry exists, Next serves it while refreshing in the
 * background and keeps it if that refresh fails, so an outage shows the last
 * good figures. Their age stays visible: `updatedAt` is Dune's execution time
 * and the page flags data that has gone stale.
 */
const getLatestExecution = unstable_cache(
  async () => {
    const apiKey = getDuneApiKey();
    if (!apiKey) throw new Error('DUNE_API_KEY not configured');
    return fetchLatestExecution(apiKey);
  },
  ['buyback-latest-execution'],
  { revalidate: PROBE_SECONDS },
);

/**
 * The full history of one execution plus the P&L computation. Keyed by the
 * execution id, so Dune is paged through once per daily execution rather than
 * once per cache expiry.
 */
const getStatsForExecution = unstable_cache(
  async (executionId: string): Promise<BuybackStats> => {
    const apiKey = getDuneApiKey();
    if (!apiKey) throw new Error('DUNE_API_KEY not configured');

    const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows(
      apiKey,
      undefined,
      executionId,
    );
    logger.debug(`Buyback stats computed from ${rows.length} daily rows of ${executionId}`);
    return computeBuybackStats(rows, { executionStartedAt, executionEndedAt });
  },
  ['buyback-stats'],
  { revalidate: HISTORY_SECONDS },
);

export async function GET() {
  if (!getDuneApiKey()) {
    logger.warn('Buyback stats requested but DUNE_API_KEY is not configured');
    return new Response('DUNE_API_KEY not configured', { status: 503 });
  }

  try {
    logger.debug('Buyback stats request received');
    const latest = await getLatestExecution();
    return Response.json(await getStatsForExecution(latest.executionId));
  } catch (error) {
    // Keep Dune's response out of the public body; the detail is in the log.
    logger.error('Buyback stats error', error);
    return new Response('Unable to load buyback stats', { status: 500 });
  }
}
