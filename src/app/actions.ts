'use server';

import { eq, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import database from 'src/config/database';
import { analyticsEventsTable } from 'src/db/schema';

export interface BridgeClickCount {
  bridgeId: string;
  count: number;
}

async function getBridgeClickedCountsFromDb(): Promise<BridgeClickCount[]> {
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
}

const getBridgeClickedCountsFromPostHog = unstable_cache(
  async (): Promise<BridgeClickCount[]> => {
    const res = await fetch(
      `https://eu.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            kind: 'HogQLQuery',
            query: `
              SELECT properties.bridgeId, count(distinct properties.$session_id) AS cnt
              FROM events
              WHERE event = 'bridge_clicked'
              GROUP BY properties.bridgeId
              ORDER BY cnt DESC
            `,
          },
        }),
      },
    );

    if (!res.ok) throw new Error(`PostHog API error: ${res.status}`);

    const data = await res.json();
    return data.results.map(([bridgeId, count]: [string, number]) => ({ bridgeId, count }));
  },
  ['bridge-clicked-counts'],
  { revalidate: 300 },
);

export async function getBridgeClickedCounts(): Promise<BridgeClickCount[]> {
  const source = process.env.BRIDGE_COUNTS_SOURCE ?? 'database';
  try {
    return await (source === 'posthog'
      ? getBridgeClickedCountsFromPostHog()
      : getBridgeClickedCountsFromDb());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching bridge click counts:', error);
    return [];
  }
}
