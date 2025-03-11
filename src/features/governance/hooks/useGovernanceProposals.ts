import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { collectProposals } from 'src/features/governance/governanceData';
import { logger } from 'src/utils/logger';
import { usePublicClient } from 'wagmi';

export function useGovernanceProposal(id?: number) {
  const { proposals } = useGovernanceProposals();
  if (!id || !proposals) return undefined;
  return proposals.find((p) => p.id === id);
}

export function useGovernanceProposals() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceProposals', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching governance proposals');
      // Fetch on-chain data
      return await collectProposals(publicClient);
    },
    gcTime: Infinity,
    staleTime: 10 * 60 * 1000,
  });

  useToastError(error, 'Error fetching governance proposals');

  return {
    isLoading,
    isError,
    proposals: data || undefined,
  };
}
