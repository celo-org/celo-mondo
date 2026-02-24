'use server';

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
