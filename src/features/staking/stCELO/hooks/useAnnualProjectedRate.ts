import { useQuery } from '@tanstack/react-query';

interface APYResponse {
  annualProjectedRate: number;
  percentage: string;
  details: {
    targetVotingYield: number;
    rewardsMultiplier: number;
    unadjustedAPR: number;
    adjustedAPR: number;
  };
}

export const useAnnualProjectedRate = (): {
  annualProjectedRate: number | undefined;
  isLoading: boolean;
} => {
  const { data, isLoading } = useQuery({
    queryKey: ['stCelo', 'apy'],
    queryFn: async () => {
      const response = await fetch('/api/stCelo/apy');
      if (!response.ok) {
        throw new Error('Failed to fetch annual projected rate');
      }
      return response.json() as Promise<APYResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    annualProjectedRate: data?.annualProjectedRate,
    isLoading,
  };
};
