import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { ProposalStage } from 'src/features/governance/types';
import { sumProposalVotes } from 'src/features/governance/utils/votes';
import { logger } from 'src/utils/logger';

export function useHistoricalProposalVoteTotals(id: number) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useHistoricalProposalVoteTotals', id],
    queryFn: async () => {
      if (!id) return null;

      logger.debug(`Fetching historical proposals votes for ${id}`);
      return sumProposalVotes(id);
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
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
      const { id, stage, proposal } = propData || {};
      if (!id || !stage || stage < ProposalStage.Approval) return null;

      // First check if proposal data already includes total
      // This will be the case for active proposals or failed ones
      if (proposal?.votes) return proposal.votes;

      // Otherwise we must query for all the vote events
      // The sumProposalVotes method does this same query so it's used here
      logger.debug(`Fetching proposals votes for ${id}`);
      const { totals } = await sumProposalVotes(id);
      return totals;
    },
    gcTime: GCTime.Short,
    staleTime: GCTime.Short,
  });

  useToastError(error, 'Error fetching proposals vote totals');

  return {
    isLoading,
    isError,
    votes: votes || undefined,
  };
}
