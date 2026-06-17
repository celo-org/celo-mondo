import { act, renderHook } from '@testing-library/react';
import * as uuid from 'uuid';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as analytics from './analytics';
import { useTrackEvent } from './useTrackEvent';

// Mock analytics module
vi.mock('./analytics');
const mockTrackEvent = vi.mocked(analytics.trackEvent);

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock uuid module
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
  validate: vi.fn(),
}));
const mockUuidv4 = vi.mocked(uuid.v4);
const mockValidateUUID = vi.mocked(uuid.validate);

describe('useTrackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockValidateUUID.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should generate session ID and store in sessionStorage', () => {
    renderHook(() => useTrackEvent());

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'analytics_session_id',
      'mock-uuid-123',
    );
  });

  test('should reuse existing session ID from sessionStorage', () => {
    mockSessionStorage.getItem.mockReturnValue('existing-session-456');
    mockValidateUUID.mockReturnValue(true);

    renderHook(() => useTrackEvent());

    expect(mockUuidv4).not.toHaveBeenCalled();
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
  });

  test('should call trackEvent with session ID', async () => {
    mockSessionStorage.getItem.mockReturnValue('test-session-789');
    mockValidateUUID.mockReturnValue(true);

    const { result } = renderHook(() => useTrackEvent());

    await act(async () => {
      await result.current('bridge_clicked', { bridgeId: 'superbridge' });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'bridge_clicked',
      { bridgeId: 'superbridge' },
      'test-session-789',
    );
  });

  test('should maintain stable reference when session ID unchanged', () => {
    mockSessionStorage.getItem.mockReturnValue('stable-session');
    mockValidateUUID.mockReturnValue(true);

    const { result, rerender } = renderHook(() => useTrackEvent());
    const firstTrack = result.current;

    rerender();
    const secondTrack = result.current;

    expect(firstTrack).toBe(secondTrack);
  });

  test('should regenerate session ID when malformed UUID is stored', () => {
    mockSessionStorage.getItem.mockReturnValue('invalid-uuid-format');
    mockValidateUUID.mockReturnValue(false);

    renderHook(() => useTrackEvent());

    expect(mockValidateUUID).toHaveBeenCalledWith('invalid-uuid-format');
    expect(mockUuidv4).toHaveBeenCalled();
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'analytics_session_id',
      'mock-uuid-123',
    );
  });

  test('should regenerate session ID when empty string is stored', () => {
    mockSessionStorage.getItem.mockReturnValue('');
    mockValidateUUID.mockReturnValue(false);

    renderHook(() => useTrackEvent());

    expect(mockUuidv4).toHaveBeenCalled();
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'analytics_session_id',
      'mock-uuid-123',
    );
  });
});
