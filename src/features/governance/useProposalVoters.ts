import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { PROPOSAL_V1_MAX_ID } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { links } from 'src/config/links';
import { queryCeloscan } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { EmptyVoteAmounts, VoteAmounts, VoteType } from 'src/features/governance/contractTypes';
import { isValidAddress } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { bigIntSum } from 'src/utils/math';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog, encodeEventTopics } from 'viem';

export function useProposalVoters(id?: number) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useProposalVoters', id],
    queryFn: () => {
      if (!id) return null;
      logger.debug(`Fetching proposals voters for ${id}`);
      return fetchProposalVoters(id);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching proposals voters');

  return {
    isLoading,
    isError,
    voters: data?.voters,
    totals: data?.totals,
  };
}

export async function fetchProposalVoters(id: number): Promise<{
  voters: AddressTo<VoteAmounts>;
  totals: VoteAmounts;
}> {
  // Get encoded topics
  const { castVoteTopics, revokeVoteTopics } =
    id > PROPOSAL_V1_MAX_ID ? getV2Topics(id) : getV1Topics(id);

  // Prep query URLs
  const topic1 = castVoteTopics[1];
  const baseUrl = `${links.celoscanApi}/api?module=logs&action=getLogs&fromBlock=100&toBlock=latest&address=${Addresses.Governance}&topic1=${topic1}&topic0_1_opr=and`;
  const castVoteLogsUrl = `${baseUrl}&topic0=${castVoteTopics[0]}`;
  const revokeVoteLogsUrl = `${baseUrl}&topic0=${revokeVoteTopics[0]}`;

  const castVoteEvents = await queryCeloscan<TransactionLog[]>(castVoteLogsUrl);
  const revokeVoteEvents = await queryCeloscan<TransactionLog[]>(revokeVoteLogsUrl);

  const voterToVotes: AddressTo<VoteAmounts> = {};
  reduceLogs(voterToVotes, castVoteEvents, true);
  reduceLogs(voterToVotes, revokeVoteEvents, false);

  // Filter out stakers who have already revoked all votes
  const voters = objFilter(
    voterToVotes,
    (_, votes): votes is VoteAmounts => bigIntSum(Object.values(votes)) > 0n,
  );

  const totals = Object.values(voters).reduce<VoteAmounts>(
    (acc, votes) => {
      acc[VoteType.Yes] += votes[VoteType.Yes];
      acc[VoteType.No] += votes[VoteType.No];
      acc[VoteType.Abstain] += votes[VoteType.Abstain];
      return acc;
    },
    { ...EmptyVoteAmounts },
  );

  return { voters, totals };
}

function reduceLogs(voterToVotes: AddressTo<VoteAmounts>, logs: TransactionLog[], isAdd: boolean) {
  for (const log of logs) {
    try {
      if (!log.topics || log.topics.length < 3) continue;
      const { eventName, args } = decodeEventLog({
        abi: governanceABI,
        data: log.data,
        // @ts-ignore https://github.com/wevm/viem/issues/381
        topics: log.topics,
        strict: false,
      });

      let account: string | undefined,
        yesVotes: bigint | undefined,
        noVotes: bigint | undefined,
        abstainVotes: bigint | undefined;

      if (eventName === 'ProposalVoted' || eventName === 'ProposalVoteRevoked') {
        account = args.account;
        yesVotes = args.value === 3n ? args.weight : 0n;
        noVotes = args.value === 2n ? args.weight : 0n;
        abstainVotes = args.value === 1n ? args.weight : 0n;
      }

      if (eventName === 'ProposalVotedV2' || eventName === 'ProposalVoteRevokedV2') {
        account = args.account;
        yesVotes = args.yesVotes;
        noVotes = args.noVotes;
        abstainVotes = args.abstainVotes;
      }

      if (!account || !isValidAddress(account)) continue;

      voterToVotes[account] ||= { ...EmptyVoteAmounts };
      if (isAdd) {
        voterToVotes[account][VoteType.Yes] += yesVotes || 0n;
        voterToVotes[account][VoteType.No] += noVotes || 0n;
        voterToVotes[account][VoteType.Abstain] += abstainVotes || 0n;
      } else {
        voterToVotes[account][VoteType.Yes] -= yesVotes || 0n;
        voterToVotes[account][VoteType.No] -= noVotes || 0n;
        voterToVotes[account][VoteType.Abstain] -= abstainVotes || 0n;
      }
    } catch (error) {
      logger.warn('Error decoding event log', error, log);
    }
  }
}

function getV1Topics(id: number) {
  const castVoteTopics = encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalVoted',
    args: { proposalId: BigInt(id) },
  });
  const revokeVoteTopics = encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalVoteRevoked',
    args: { proposalId: BigInt(id) },
  });
  return { castVoteTopics, revokeVoteTopics };
}

function getV2Topics(id: number) {
  const castVoteTopics = encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalVotedV2',
    args: { proposalId: BigInt(id) },
  });
  const revokeVoteTopics = encodeEventTopics({
    abi: governanceABI,
    eventName: 'ProposalVoteRevokedV2',
    args: { proposalId: BigInt(id) },
  });
  return { castVoteTopics, revokeVoteTopics };
}
