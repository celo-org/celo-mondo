import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the database and headers
vi.mock('src/config/database', () => ({
  default: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}));

vi.mock('src/db/schema', () => ({
  analyticsEventsTable: {
    id: 'id',
  },
}));

import database from 'src/config/database';
import { trackAnalyticsEvent } from './actions';

const mockDatabase = vi.mocked(database);

describe('trackAnalyticsEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should successfully track a valid analytics event', async () => {
    mockDatabase.returning.mockResolvedValueOnce([{ id: 123 }]);

    const result = await trackAnalyticsEvent({
      eventName: 'bridge_clicked',
      properties: { bridgeId: 'mock-bridge' },
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result).toEqual({
      success: true,
    });

    expect(mockDatabase.insert).toHaveBeenCalled();
    expect(mockDatabase.values).toHaveBeenCalledWith({
      eventName: 'bridge_clicked',
      properties: { bridgeId: 'mock-bridge' },
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  test('should return error for missing required fields', async () => {
    const result = await trackAnalyticsEvent({
      eventName: '',
      properties: { bridgeId: 'mock-bridge' },
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid parameters. Required fields: eventName, properties, sessionId',
    });

    expect(mockDatabase.insert).not.toHaveBeenCalled();
  });

  test('should return error for invalid sessionId format', async () => {
    const result = await trackAnalyticsEvent({
      eventName: 'bridge_clicked',
      properties: { bridgeId: 'mock-bridge' },
      sessionId: 'invalid-uuid',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid sessionId format. Must be a valid UUID',
    });

    expect(mockDatabase.insert).not.toHaveBeenCalled();
  });

  test('should return error for invalid event properties', async () => {
    const result = await trackAnalyticsEvent({
      eventName: 'bridge_clicked',
      properties: { invalidProp: 'value' },
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid event properties for event type: bridge_clicked',
    });

    expect(mockDatabase.insert).not.toHaveBeenCalled();
  });

  test('should handle database errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDatabase.returning.mockRejectedValueOnce(new Error('Database error'));

    const result = await trackAnalyticsEvent({
      eventName: 'bridge_clicked',
      properties: { bridgeId: 'mock-bridge' },
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to track analytics event',
    });

    expect(consoleSpy).toHaveBeenCalledWith('Analytics event tracking error:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
