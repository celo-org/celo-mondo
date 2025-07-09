import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { fetchProposalVoters } from 'src/features/governance/utils/votes';
import { logger } from 'src/utils/logger';

export function useProposalVoters(id?: number) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useProposalVoters', id],
    queryFn: () => {
      if (!id) return null;
      logger.debug(`Fetching proposals voters for ${id}`);
      return fetchProposalVoters(id);
    },
    gcTime: GCTime.Long,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching proposals voters');

  return {
    isLoading,
    isError,
    voters: data?.voters,
    totals: data?.totals,
  };
}
