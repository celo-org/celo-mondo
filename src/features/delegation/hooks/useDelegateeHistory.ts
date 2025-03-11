import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanLogs } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { decodeVoteEventLog } from 'src/features/governance/hooks/useProposalVoters';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { bigIntSum } from 'src/utils/math';
import { objFilter } from 'src/utils/objects';
import { encodeEventTopics } from 'viem';

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
  const v1Topics = getV1Topics(address);
  const v2Topics = getV2Topics(address);

  const castVoteV1Params = `topic0=${v1Topics[0]}&topic2=${v1Topics[2]}&topic0_2_opr=and`;
  const castVoteV1Events = await queryCeloscanLogs(Addresses.Governance, castVoteV1Params);

  const castVoteV2Params = `topic0=${v2Topics[0]}&topic2=${v2Topics[2]}&topic0_2_opr=and`;
  const castVoteV2Events = await queryCeloscanLogs(Addresses.Governance, castVoteV2Params);

  const proposalToVotes: Record<number, VoteAmounts> = {};
  reduceLogs(proposalToVotes, castVoteV1Events);
  reduceLogs(proposalToVotes, castVoteV2Events);

  // Filter out voters with no current votes
  return objFilter(
    proposalToVotes,
    (_, votes): votes is VoteAmounts => bigIntSum(Object.values(votes)) > 0n,
  );
}

function reduceLogs(proposalToVotes: Record<number, VoteAmounts>, logs: TransactionLog[]) {
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

function getV1Topics(account: Address) {
  return encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalVoted',
    args: { account },
  });
}

function getV2Topics(account: Address) {
  return encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalVotedV2',
    args: { account },
  });
}
