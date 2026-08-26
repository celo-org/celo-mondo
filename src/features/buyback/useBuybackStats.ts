import { useQuery } from '@tanstack/react-query';
import { BuybackStats } from 'src/features/buyback/types';

export function useBuybackStats(): {
  stats: BuybackStats | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['buyback', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/buyback');
      if (!response.ok) {
        throw new Error('Failed to fetch buyback stats');
      }
      return response.json() as Promise<BuybackStats>;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: false,
  });

  return { stats: data, isLoading, isError };
}
