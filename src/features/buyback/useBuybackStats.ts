import { useQuery } from '@tanstack/react-query';
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

  const hasStats = data !== undefined;
  return {
    stats: data,
    view: selectBuybackView(hasStats, isError),
    refreshFailed: hasStats && isError,
  };
}
