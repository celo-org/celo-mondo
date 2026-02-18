'use server';

import database from 'src/config/database';
import { analyticsEventsTable } from 'src/db/schema';
import { AnalyticsEventName, isValidAnalyticsEvent } from 'src/types/analytics';
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

    // Validate event name and properties type safety
    if (!isValidAnalyticsEvent(eventName as AnalyticsEventName, properties)) {
      return {
        success: false,
        error: `Invalid event properties for event type: ${eventName}`,
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
