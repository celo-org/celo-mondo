import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { trackEvent } from './analytics';

describe('trackEvent', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('should call fetch with required parameters', () => {
    trackEvent('bridge_clicked', { bridgeId: 'mock-bridge' }, 'session-123');

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'bridge_clicked',
        properties: { bridgeId: 'mock-bridge' },
        sessionId: 'session-123',
      }),
      keepalive: true,
    });
  });

  test('should track different event types', () => {
    trackEvent('wallet_connected', { walletType: 'metamask' }, 'session-456');

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'wallet_connected',
        properties: { walletType: 'metamask' },
        sessionId: 'session-456',
      }),
      keepalive: true,
    });
  });

  test('should handle fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    trackEvent('bridge_clicked', { bridgeId: 'squid-router' }, 'session-789');

    // Wait for the catch handler to run
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Analytics tracking error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
