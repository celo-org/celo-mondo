import { useQuery } from '@tanstack/react-query';
import { BuybackStats } from 'src/features/buyback/types';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

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
