import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BuybackStats } from 'src/features/buyback/types';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
// The Dune query is re-executed once a day, so anything older than a day and a
// half has missed a refresh.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export type BuybackView = 'stats' | 'error' | 'loading';

export interface BuybackStatsState {
  stats: BuybackStats | undefined;
  /** Which of the three page states to render. */
  view: BuybackView;
  /** A background refresh failed; the figures shown come from an earlier load. */
  refreshFailed: boolean;
  /** The figures come from a Dune execution old enough that a refresh was missed. */
  isStale: boolean;
}

/**
 * Decide what the page renders. Loaded figures win over a later error: React
 * Query keeps the previous data when a scheduled refetch fails, and an outage
 * notice must not replace numbers that are still valid.
 */
export function selectBuybackView(hasStats: boolean, isError: boolean): BuybackView {
  if (hasStats) return 'stats';
  return isError ? 'error' : 'loading';
}

/**
 * Whether the figures come from a Dune execution old enough that a daily
 * refresh must have failed. The server keeps serving its last good result
 * through an outage, so this is the only signal a reader gets.
 */
export function isBuybackDataStale(updatedAt: string | null | undefined, now: Date): boolean {
  if (!updatedAt) return false;
  const executedAt = new Date(updatedAt).getTime();
  return !Number.isNaN(executedAt) && now.getTime() - executedAt > STALE_AFTER_MS;
}

/**
 * Live version of `isBuybackDataStale`. Refetches that return the same payload
 * do not re-render the page, so a tab left open would never notice the data
 * crossing the threshold; a timer wakes the hook at that moment instead (at
 * once if it has already passed).
 */
export function useIsBuybackDataStale(updatedAt: string | null | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const executedAt = updatedAt ? new Date(updatedAt).getTime() : Number.NaN;
    if (Number.isNaN(executedAt)) return;
    const untilStale = executedAt + STALE_AFTER_MS - Date.now();
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, untilStale) + 1);
    return () => clearTimeout(timer);
  }, [updatedAt]);

  return isBuybackDataStale(updatedAt, new Date(now));
}

export function useBuybackStats(): BuybackStatsState {
  const { data, isError } = useQuery({
    queryKey: ['buyback', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/buyback');
      if (!response.ok) {
        throw new Error('Failed to fetch buyback stats');
      }
      return response.json() as Promise<BuybackStats>;
    },
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: false,
  });

  const isStale = useIsBuybackDataStale(data?.updatedAt);
  const hasStats = data !== undefined;
  return {
    stats: data,
    view: selectBuybackView(hasStats, isError),
    refreshFailed: hasStats && isError,
    isStale,
  };
}
