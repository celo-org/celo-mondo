'use server';

import { eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { analyticsEventsTable } from 'src/db/schema';

export interface BridgeClickCount {
  bridgeId: string;
  count: number;
}

export async function getBridgeClickedCounts(): Promise<BridgeClickCount[]> {
  try {
    const bridgeClickCounts = await database
      .select({
        bridgeId: sql<string>`properties->>'bridgeId'`,
        count: sql<number>`count(distinct "sessionId")::int`,
      })
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.eventName, 'bridge_clicked'))
      .groupBy(sql`properties->>'bridgeId'`)
      .orderBy(sql`count(distinct "sessionId") desc`);

    return bridgeClickCounts;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching bridge click counts:', error);
    return [];
  }
}
