import { trackAnalyticsEvent } from 'src/app/actions';
import { AnalyticsEventMap, AnalyticsEventName } from 'src/types/analytics';

// Type-safe analytics tracking helper
export async function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  properties: AnalyticsEventMap[T],
  sessionId: string,
): Promise<void> {
  try {
    const result = await trackAnalyticsEvent({
      eventName,
      properties,
      sessionId,
    });

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('Failed to track analytics event:', result.error);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics tracking error:', error);
    // Don't throw - analytics failures shouldn't break the app
  }
}
