import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GovernanceProposal } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useGovernanceProposals() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceProposals', publicClient],
    queryFn: () => {
      logger.debug('Fetching governance proposals');
      return fetchGovernanceProposals(publicClient);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching governance proposals');

  return {
    isLoading,
    isError,
    proposals: data,
  };
}

async function fetchGovernanceProposals(
  _publicClient: PublicClient,
): Promise<GovernanceProposal[]> {
  return [];
}
