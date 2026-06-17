import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { MergedProposalData } from 'src/features/governance/governanceData';
import {
  ACTIVE_PROPOSAL_STAGES,
  ProposalStage,
  VoteAmounts,
  VoteType,
} from 'src/features/governance/types';
import { sumProposalVotes } from 'src/features/governance/utils/votes';
import { celoPublicClient } from 'src/utils/client';
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
  const id = propData?.id;
  const stage = propData?.stage;
  const proposalVotes = propData?.proposal?.votes;
  const isActive = !!stage && ACTIVE_PROPOSAL_STAGES.includes(stage);

  const {
    isLoading,
    isError,
    error,
    data: votes,
  } = useQuery({
    queryKey: ['useProposalVoteTotals', id, stage, isActive, proposalVotes],
    queryFn: async () => {
      if (!id || !stage || stage < ProposalStage.Approval) return null;

      // For active proposals, read vote totals directly from chain
      // This ensures fresh data immediately after voting
      if (isActive) {
        logger.debug(`Fetching on-chain vote totals for proposal ${id}`);
        const [yes, no, abstain] = await celoPublicClient.readContract({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getVoteTotals',
          args: [BigInt(id)],
        });
        return {
          [VoteType.Yes]: yes,
          [VoteType.No]: no,
          [VoteType.Abstain]: abstain,
        } as VoteAmounts;
      }

      // For past proposals, use DB data if available
      if (proposalVotes) return proposalVotes;

      // Otherwise query for all the vote events
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
