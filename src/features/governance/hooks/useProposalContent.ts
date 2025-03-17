import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { fetchProposalContent } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';

export function useProposalContent(metadata?: ProposalMetadata) {
  const cgpNumber = metadata?.cgp;
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useProposalContent', cgpNumber],
    queryFn: () => {
      if (!cgpNumber) return null;
      logger.debug('Fetching proposal content', cgpNumber);
      return fetchProposalContent(cgpNumber);
    },
    gcTime: GCTime.Long,
    staleTime: StaleTime.Short,
  });

  useToastError(error, 'Error fetching proposal content');

  return {
    isLoading,
    isError,
    content: data || undefined,
  };
}
