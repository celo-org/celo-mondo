import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { trackEvent } from './analytics';

const mockFetch = vi.fn();
global.fetch = mockFetch;

Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/test' },
  writable: true,
});

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should send analytics event with required parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await trackEvent('bridge_clicked', { bridgeId: 'mock-bridge' }, 'session-123');

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName: 'bridge_clicked',
        properties: { bridgeId: 'mock-bridge' },
        url: 'http://localhost:3000/test',
        sessionId: 'session-123',
      }),
    });
  });

  test('should use custom URL when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await trackEvent('bridge_clicked', { bridgeId: 'portal-bridge' }, 'session-456', {
      url: 'http://localhost:3000/custom',
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName: 'bridge_clicked',
        properties: { bridgeId: 'portal-bridge' },
        url: 'http://localhost:3000/custom',
        sessionId: 'session-456',
      }),
    });
  });

  test('should handle API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid request' }),
    });

    // Should not throw
    await expect(
      trackEvent('bridge_clicked', { bridgeId: 'squid-router' }, 'session-789'),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to track analytics event:', {
      error: 'Invalid request',
    });

    consoleSpy.mockRestore();
  });

  test('should handle network errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Should not throw
    await expect(
      trackEvent('bridge_clicked', { bridgeId: 'usdt0' }, 'session-999'),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith('Analytics tracking error:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
