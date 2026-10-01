import { computeBuybackStats } from 'src/features/buyback/computeStats';
import { fetchDuneFeeRows } from 'src/features/buyback/fetchDuneResults';
import { logger } from 'src/utils/logger';

export const revalidate = 900; // Cache response for 15 minutes

export async function GET() {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) {
    logger.warn('Buyback stats requested but DUNE_API_KEY is not configured');
    return new Response('DUNE_API_KEY not configured', { status: 503 });
  }

  try {
    logger.debug('Buyback stats request received');

    const { rows, executionEndedAt } = await fetchDuneFeeRows(apiKey);
    const stats = computeBuybackStats(rows, { executionEndedAt });

    logger.debug(`Buyback stats computed from ${rows.length} daily rows`);

    return Response.json(stats);
  } catch (error) {
    // Keep Dune's response out of the public body; the detail is in the log.
    logger.error('Buyback stats error', error);
    return new Response('Unable to load buyback stats', { status: 500 });
  }
}
