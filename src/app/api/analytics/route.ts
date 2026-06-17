import { NextRequest, NextResponse } from 'next/server';
import database from 'src/config/database';
import { analyticsEventsTable } from 'src/db/schema';
import {
  AnalyticsEventName,
  isValidAnalyticsEvent,
  validateAnalyticsEvent,
} from 'src/types/analytics';
import { isAllowedOrigin } from 'src/utils/isAllowedOrigin';
import { validate as uuidValidate } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (!isAllowedOrigin(origin, referer)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { eventName, properties, sessionId } = await request.json();

    if (!eventName || typeof eventName !== 'string' || !properties || !sessionId) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    if (!uuidValidate(sessionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sessionId format' },
        { status: 400 },
      );
    }

    if (!isValidAnalyticsEvent(eventName as AnalyticsEventName, properties)) {
      return NextResponse.json(
        { success: false, error: `Invalid event properties for: ${eventName}` },
        { status: 400 },
      );
    }

    const validation = validateAnalyticsEvent(eventName as AnalyticsEventName, properties);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    await database
      .insert(analyticsEventsTable)
      .values({ eventName, properties, sessionId })
      .returning({ id: analyticsEventsTable.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics event tracking error:', error);
    return NextResponse.json({ success: false, error: 'Failed to track event' }, { status: 500 });
  }
}
