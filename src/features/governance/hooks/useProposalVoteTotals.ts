import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { fetchProposalVoters } from 'src/features/governance/hooks/useProposalVoters';
import { ProposalStage } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { MergedProposalData } from '../governanceData';

export function useHistoricalProposalVoteTotals(id: number) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useHistoricalProposalVoteTotals', id],
    queryFn: async () => {
      if (!id) return null;

      logger.debug(`Fetching historical proposals votes for ${id}`);
      return fetchProposalVoters(id);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000 * 4, // 4 hour
  });

  useToastError(error, 'Error fetching historical proposals vote totals');

  return {
    isLoading,
    isError,
    votes: data?.totals,
  };
}

export function useProposalVoteTotals(propData?: MergedProposalData) {
  const {
    isLoading,
    isError,
    error,
    data: votes,
  } = useQuery({
    queryKey: ['useProposalVoteTotals', propData],
    queryFn: async () => {
      const { id, stage, proposal, metadata } = propData || {};
      if (!id || !stage || stage < ProposalStage.Referendum) return null;

      // First check if proposal data already includes total
      // This will be the case for active proposals or failed ones
      if (proposal?.votes) return proposal.votes;

      // Next check if proposal metadata has it
      // This will be the case for old proposals queried at build time
      if (metadata?.votes) return metadata.votes;

      // Otherwise we must query for all the vote events
      // The fetchProposalVoters method does this same query so it's used here
      logger.debug(`Fetching proposals votes for ${id}`);
      const { totals } = await fetchProposalVoters(id);
      return totals;
    },
    gcTime: Infinity,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useToastError(error, 'Error fetching proposals vote totals');

  return {
    isLoading,
    isError,
    votes: votes || undefined,
  };
}
