import { useQuery } from '@tanstack/react-query';
import { Event, fetchProposalEvents } from 'src/app/governance/events';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { decodeVoteEventLog } from 'src/features/governance/utils/votes';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { bigIntSum } from 'src/utils/math';
import { objFilter } from 'src/utils/objects';

export function useDelegateeHistory(address?: Address) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useDelegateeHistory', address],
    queryFn: () => {
      if (!address) return null;
      logger.debug(`Fetching delegatee history for ${address}`);
      return fetchDelegateeHistory(address);
    },
    gcTime: GCTime.Long,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching delegatee history');

  return {
    isLoading,
    isError,
    proposalToVotes: data || undefined,
  };
}

export async function fetchDelegateeHistory(
  address: Address,
): Promise<Record<number, VoteAmounts>> {
  const castVoteEvents = await fetchProposalEvents(celoPublicClient.chain.id, 'ProposalVoted', {
    account: address,
  });

  const proposalToVotes: Record<number, VoteAmounts> = {};
  reduceLogs(proposalToVotes, castVoteEvents);

  // Filter out voters with no current votes
  return objFilter(
    proposalToVotes,
    (_, votes): votes is VoteAmounts => bigIntSum(Object.values(votes)) > 0n,
  );
}

function reduceLogs(proposalToVotes: Record<number, VoteAmounts>, logs: Event[]) {
  for (const log of logs) {
    const decoded = decodeVoteEventLog(log);
    if (!decoded) continue;
    const { proposalId, yesVotes, noVotes, abstainVotes } = decoded;
    proposalToVotes[proposalId] = {
      [VoteType.Yes]: yesVotes,
      [VoteType.No]: noVotes,
      [VoteType.Abstain]: abstainVotes,
    };
  }
}
