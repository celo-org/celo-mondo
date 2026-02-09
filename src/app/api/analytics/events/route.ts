import { NextRequest, NextResponse } from 'next/server';
import database from 'src/config/database';
import { analyticsEventsTable } from 'src/db/schema';
import { AnalyticsEventName, isValidAnalyticsEvent } from 'src/types/analytics';
import { validate as uuidValidate } from 'uuid';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body structure
    if (!body || typeof body.eventName !== 'string' || !body.properties || !body.sessionId) {
      return NextResponse.json(
        { error: 'Invalid request body. Required fields: eventName, properties, sessionId' },
        { status: 400 },
      );
    }

    const { eventName, properties, url, sessionId } = body;

    // Validate sessionId format
    if (!uuidValidate(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format. Must be a valid UUID' },
        { status: 400 },
      );
    }

    // Extract domain from request headers
    const host = request.headers.get('host') || '';
    const referer = request.headers.get('referer');
    const domain = referer ? new URL(referer).hostname : host;

    // Validate event name and properties type safety
    if (!isValidAnalyticsEvent(eventName as AnalyticsEventName, properties)) {
      return NextResponse.json(
        { error: `Invalid event properties for event type: ${eventName}` },
        { status: 400 },
      );
    }

    // Insert into database
    const result = await database
      .insert(analyticsEventsTable)
      .values({
        eventName,
        domain,
        url,
        properties,
        sessionId,
      })
      .returning({ id: analyticsEventsTable.id });

    return NextResponse.json(
      {
        success: true,
        id: result[0].id,
      },
      { status: 201 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics event tracking error:', error);
    return NextResponse.json({ error: 'Failed to track analytics event' }, { status: 500 });
  }
}
