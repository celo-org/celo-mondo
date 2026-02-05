// Type-safe analytics event system

export interface BridgeClickedProperties {
  bridgeId: string;
}

// Analytics event mapping - ensures type safety between event names and their properties
export interface AnalyticsEventMap {
  bridge_clicked: BridgeClickedProperties;
}

// Extract valid event names
export type AnalyticsEventName = keyof AnalyticsEventMap;

// Type-safe event payload
export interface AnalyticsEventPayload<T extends AnalyticsEventName = AnalyticsEventName> {
  eventName: T;
  properties: AnalyticsEventMap[T];
  url?: string;
  sessionId?: string;
}

// Type guard to validate event payload
export function isValidAnalyticsEvent<T extends AnalyticsEventName>(
  eventName: T,
  properties: unknown,
): properties is AnalyticsEventMap[T] {
  if (eventName === 'bridge_clicked') {
    const props = properties as BridgeClickedProperties;
    return typeof props.bridgeId === 'string';
  }
  return false;
}
