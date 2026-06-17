import { AnalyticsEventMap, AnalyticsEventName } from 'src/types/analytics';

// Type-safe analytics tracking helper using a plain fetch to avoid blocking Next.js navigation
// (server actions serialize with RSC requests and delay client-side transitions)
export function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  properties: AnalyticsEventMap[T],
  sessionId: string,
): void {
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, properties, sessionId }),
    keepalive: true,
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Analytics tracking error:', error);
  });
}
