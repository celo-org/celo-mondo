import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuybackStats } from './types';
import { isBuybackDataStale, selectBuybackView, useBuybackStats } from './useBuybackStats';

const stats: BuybackStats = {
  totals: {
    feesCollectedUsd: 600,
    feesAfterExpensesUsd: 550,
    celoToCommunityFund: 4675,
    usdToCommunityFund: 467.5,
    avgCeloPriceUsd: 0.1,
  },
  latestDayStats: null,
  sinceDay: '2026-04-09',
  latestDay: '2026-05-01',
  updatedAt: '2026-05-02T05:31:00.000Z',
};

const ok = () => ({ ok: true, json: async () => stats });
const failed = () => ({ ok: false, json: async () => ({}) });

const fetchMock = vi.fn();
let queryClient: QueryClient;

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  queryClient = new QueryClient();
});

afterEach(() => {
  queryClient.clear();
  vi.unstubAllGlobals();
});

describe('selectBuybackView', () => {
  it('shows the skeleton until something arrives', () => {
    expect(selectBuybackView(false, false)).toBe('loading');
  });

  it('shows the outage notice only when there is nothing to show', () => {
    expect(selectBuybackView(false, true)).toBe('error');
  });

  it('keeps showing loaded figures, with or without a later error', () => {
    expect(selectBuybackView(true, false)).toBe('stats');
    expect(selectBuybackView(true, true)).toBe('stats');
  });
});

describe('isBuybackDataStale', () => {
  const executed = '2026-05-02T05:31:00.000Z';

  it('is false while the daily refresh is on schedule', () => {
    expect(isBuybackDataStale(executed, new Date('2026-05-02T06:00:00.000Z'))).toBe(false);
    // Just before the next day's run has landed, plus some slack.
    expect(isBuybackDataStale(executed, new Date('2026-05-03T17:30:00.000Z'))).toBe(false);
  });

  it('is true once a refresh has clearly been missed', () => {
    expect(isBuybackDataStale(executed, new Date('2026-05-03T17:32:00.000Z'))).toBe(true);
    expect(isBuybackDataStale(executed, new Date('2026-05-20T00:00:00.000Z'))).toBe(true);
  });

  it('accepts the microsecond timestamps Dune returns', () => {
    expect(
      isBuybackDataStale('2026-05-02T05:31:00.014698Z', new Date('2026-05-09T00:00:00.000Z')),
    ).toBe(true);
  });

  it('says nothing when the execution time is unknown or malformed', () => {
    const now = new Date('2026-05-20T00:00:00.000Z');
    expect(isBuybackDataStale(null, now)).toBe(false);
    expect(isBuybackDataStale(undefined, now)).toBe(false);
    expect(isBuybackDataStale('not a date', now)).toBe(false);
  });
});

describe('useBuybackStats', () => {
  it('goes from loading to stats on a successful load', async () => {
    fetchMock.mockResolvedValue(ok());
    const { result } = renderHook(() => useBuybackStats(), { wrapper });

    expect(result.current.view).toBe('loading');
    await waitFor(() => expect(result.current.view).toBe('stats'));
    expect(result.current.stats).toEqual(stats);
    expect(result.current.refreshFailed).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/buyback');
  });

  it('shows the error state when the first load fails', async () => {
    fetchMock.mockResolvedValue(failed());
    const { result } = renderHook(() => useBuybackStats(), { wrapper });

    await waitFor(() => expect(result.current.view).toBe('error'));
    expect(result.current.stats).toBeUndefined();
    expect(result.current.refreshFailed).toBe(false);
  });

  it('keeps the loaded figures on screen when a later refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(ok());
    const { result } = renderHook(() => useBuybackStats(), { wrapper });
    await waitFor(() => expect(result.current.view).toBe('stats'));

    // The scheduled refetch hits an outage.
    fetchMock.mockResolvedValue(failed());
    await queryClient.invalidateQueries({ queryKey: ['buyback', 'stats'] });

    await waitFor(() => expect(result.current.refreshFailed).toBe(true));
    expect(result.current.view).toBe('stats');
    expect(result.current.stats).toEqual(stats);
  });

  it('clears the refresh warning once a refetch succeeds again', async () => {
    fetchMock.mockResolvedValueOnce(ok()).mockResolvedValueOnce(failed()).mockResolvedValue(ok());
    const { result } = renderHook(() => useBuybackStats(), { wrapper });
    await waitFor(() => expect(result.current.view).toBe('stats'));

    await queryClient.invalidateQueries({ queryKey: ['buyback', 'stats'] });
    await waitFor(() => expect(result.current.refreshFailed).toBe(true));

    await queryClient.invalidateQueries({ queryKey: ['buyback', 'stats'] });
    await waitFor(() => expect(result.current.refreshFailed).toBe(false));
    expect(result.current.view).toBe('stats');
  });
});
