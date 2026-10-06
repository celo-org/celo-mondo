import { desc } from 'drizzle-orm';
import database from 'src/config/database';
import { buybackStatsTable } from 'src/db/schema';
import { logger } from 'src/utils/logger';

// Run the handler on every request: the figures live in the database, where
// the daily refresh (src/scripts/refreshBuybackStats.ts) stores a row per Dune
// execution, and the one started last is served: that is the newest snapshot
// of the chain, whichever execution finished last. Nothing here talks to Dune.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [row] = await database
      .select({ stats: buybackStatsTable.stats })
      .from(buybackStatsTable)
      .orderBy(desc(buybackStatsTable.startedAt))
      .limit(1);
    if (!row) {
      logger.warn('Buyback stats requested before any refresh stored them');
      return new Response('Buyback stats not available yet', { status: 503 });
    }
    return Response.json(row.stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Keep the database's message out of the public body; the detail is in the log.
    logger.error('Buyback stats error', error);
    return new Response('Unable to load buyback stats', { status: 500 });
  }
}
