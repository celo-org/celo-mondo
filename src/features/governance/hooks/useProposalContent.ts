import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { fetchProposalContent } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';

export function useProposalContent(metadata?: ProposalMetadata) {
  const url = metadata?.cgpUrl;
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useProposalContent', url],
    queryFn: () => {
      if (!url) return null;
      logger.debug('Fetching proposal content', url);
      return fetchProposalContent(url);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching proposal content');

  return {
    isLoading,
    isError,
    content: data || undefined,
  };
}
