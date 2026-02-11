import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the server action
vi.mock('src/app/actions', () => ({
  trackAnalyticsEvent: vi.fn(),
}));

import { trackAnalyticsEvent } from 'src/app/actions';
import { trackEvent } from './analytics';

const mockTrackAnalyticsEvent = vi.mocked(trackAnalyticsEvent);

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should call server action with required parameters', async () => {
    mockTrackAnalyticsEvent.mockResolvedValueOnce({
      success: true,
      id: 123,
    });

    await trackEvent('bridge_clicked', { bridgeId: 'mock-bridge' }, 'session-123');

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith({
      eventName: 'bridge_clicked',
      properties: { bridgeId: 'mock-bridge' },
      sessionId: 'session-123',
    });
  });

  test('should track different event types', async () => {
    mockTrackAnalyticsEvent.mockResolvedValueOnce({
      success: true,
      id: 456,
    });

    await trackEvent('wallet_connected', { walletType: 'metamask' }, 'session-456');

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith({
      eventName: 'wallet_connected',
      properties: { walletType: 'metamask' },
      sessionId: 'session-456',
    });
  });

  test('should handle server action errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockTrackAnalyticsEvent.mockResolvedValueOnce({
      success: false,
      error: 'Invalid request',
    });

    // Should not throw
    await expect(
      trackEvent('bridge_clicked', { bridgeId: 'squid-router' }, 'session-789'),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to track analytics event:', 'Invalid request');

    consoleSpy.mockRestore();
  });

  test('should handle server action exceptions gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockTrackAnalyticsEvent.mockRejectedValueOnce(new Error('Server error'));

    // Should not throw
    await expect(
      trackEvent('bridge_clicked', { bridgeId: 'usdt0' }, 'session-999'),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith('Analytics tracking error:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
