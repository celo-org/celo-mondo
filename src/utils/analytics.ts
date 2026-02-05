import { AnalyticsEventMap, AnalyticsEventName, AnalyticsEventPayload } from 'src/types/analytics';

// Type-safe analytics tracking helper
export async function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  properties: AnalyticsEventMap[T],
  sessionId: string,
  options?: {
    url?: string;
  },
): Promise<void> {
  try {
    const payload: AnalyticsEventPayload<T> = {
      eventName,
      properties,
      url: options?.url || window.location.href,
      sessionId,
    };

    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to track analytics event:', error);
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Don't throw - analytics failures shouldn't break the app
  }
}
