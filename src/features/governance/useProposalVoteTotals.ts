import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { ProposalStage } from 'src/features/governance/contractTypes';
import { MergedProposalData } from 'src/features/governance/useGovernanceProposals';
import { fetchProposalVoters } from 'src/features/governance/useProposalVoters';
import { logger } from 'src/utils/logger';

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
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching proposals vote totals');

  return {
    isLoading,
    isError,
    votes: votes || undefined,
  };
}
