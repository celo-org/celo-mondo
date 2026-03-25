'use server';

import { eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { analyticsEventsTable } from 'src/db/schema';
import {
  AnalyticsEventName,
  isValidAnalyticsEvent,
  validateAnalyticsEvent,
} from 'src/types/analytics';
import { validate as uuidValidate } from 'uuid';

interface TrackAnalyticsEventParams {
  eventName: string;
  properties: unknown;
  sessionId: string;
}

interface TrackAnalyticsEventResult {
  success: boolean;
  id?: number;
  error?: string;
}

export async function trackAnalyticsEvent(
  params: TrackAnalyticsEventParams,
): Promise<TrackAnalyticsEventResult> {
  try {
    const { eventName, properties, sessionId } = params;

    // Validate request parameters structure
    if (!eventName || typeof eventName !== 'string' || !properties || !sessionId) {
      return {
        success: false,
        error: 'Invalid parameters. Required fields: eventName, properties, sessionId',
      };
    }

    // Validate sessionId format
    if (!uuidValidate(sessionId)) {
      return {
        success: false,
        error: 'Invalid sessionId format. Must be a valid UUID',
      };
    }

    // Validate event name and properties type safety (legacy check)
    if (!isValidAnalyticsEvent(eventName as AnalyticsEventName, properties)) {
      return {
        success: false,
        error: `Invalid event properties for event type: ${eventName}`,
      };
    }

    // Additional server-side validation using Zod schemas
    const validation = validateAnalyticsEvent(eventName as AnalyticsEventName, properties);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Insert into database
    await database
      .insert(analyticsEventsTable)
      .values({
        eventName,
        properties,
        sessionId,
      })
      .returning({ id: analyticsEventsTable.id });

    return {
      success: true,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics event tracking error:', error);
    return {
      success: false,
      error: 'Failed to track analytics event',
    };
  }
}

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

async function getBridgeClickedCountsFromPostHog(): Promise<BridgeClickCount[]> {
  const res = await fetch(
    `https://us.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/query`,
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
      // Cache the response for an hour
      next: { revalidate: 3600 },
    },
  );

  const data = await res.json();
  return data.results.map(([bridgeId, count]: [string, number]) => ({ bridgeId, count }));
}

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
