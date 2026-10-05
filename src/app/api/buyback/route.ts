import { unstable_cache } from 'next/cache';
import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { fetchDuneFeeRows } from 'src/features/buyback/fetchDuneResults';
import { BuybackStats } from 'src/features/buyback/types';
import { logger } from 'src/utils/logger';

// Run the handler on every request. A `revalidate` export only caches a GET
// handler that can be prerendered at build time, and a build without the Dune
// key answers 503, which Next refuses to prerender and so leaves the route
// uncached. The shared cache is the explicit data cache below instead.
export const dynamic = 'force-dynamic';

const CACHE_SECONDS = 15 * 60;

/** The configured Dune key, or undefined when it is unset or blank. */
function getDuneApiKey(): string | undefined {
  return process.env.DUNE_API_KEY?.trim() || undefined;
}

/**
 * One Dune read plus the P&L computation, cached across requests and server
 * instances for 15 minutes, so page visits and React Query refetches reuse a
 * single result instead of each paging through Dune.
 *
 * A failed read is never stored. With nothing cached yet it surfaces as an
 * error; once an entry exists, Next serves it while refreshing in the
 * background and keeps it if that refresh fails, so an outage shows the last
 * good figures. Their age stays visible: `updatedAt` is Dune's execution time
 * and the page flags data that has gone stale.
 */
const getCachedBuybackStats = unstable_cache(
  async (): Promise<BuybackStats> => {
    const apiKey = getDuneApiKey();
    if (!apiKey) throw new Error('DUNE_API_KEY not configured');

    const { rows, executionStartedAt, executionEndedAt } = await fetchDuneFeeRows(apiKey);
    logger.debug(`Buyback stats computed from ${rows.length} daily rows`);
    return computeBuybackStats(rows, { executionStartedAt, executionEndedAt });
  },
  ['buyback-stats'],
  { revalidate: CACHE_SECONDS },
);

export async function GET() {
  if (!getDuneApiKey()) {
    logger.warn('Buyback stats requested but DUNE_API_KEY is not configured');
    return new Response('DUNE_API_KEY not configured', { status: 503 });
  }

  try {
    logger.debug('Buyback stats request received');
    return Response.json(await getCachedBuybackStats());
  } catch (error) {
    // Keep Dune's response out of the public body; the detail is in the log.
    logger.error('Buyback stats error', error);
    return new Response('Unable to load buyback stats', { status: 500 });
  }
}
