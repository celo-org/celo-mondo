import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { links } from 'src/config/links';
import { queryCeloscan } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { isValidAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog, encodeEventTopics } from 'viem';

export function useValidatorStakers(group?: Address) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useValidatorStakers', group],
    queryFn: () => {
      if (!group) return null;
      logger.debug(`Fetching stakers for group ${group}`);
      return fetchValidatorGroupStakers(group);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching group stakers');

  return {
    isLoading,
    isError,
    stakers: data || undefined,
  };
}

async function fetchValidatorGroupStakers(group: Address): Promise<Record<Address, number>> {
  // Get encoded topics
  const castVoteTopics = encodeEventTopics({
    abi: electionABI,
    eventName: 'ValidatorGroupVoteCast',
    args: { group },
  });
  const revokeActiveTopics = encodeEventTopics({
    abi: electionABI,
    eventName: 'ValidatorGroupActiveVoteRevoked',
    args: { group },
  });
  const revokePendingTopics = encodeEventTopics({
    abi: electionABI,
    eventName: 'ValidatorGroupPendingVoteRevoked',
    args: { group },
  });

  // Prep query URLs
  const topic2 = castVoteTopics[2];
  const baseUrl = `${links.celoscanApi}/api?module=logs&action=getLogs&fromBlock=100&toBlock=latest&address=${Addresses.Election}&topic2=${topic2}&topic0_2_opr=and`;
  const castVoteLogsUrl = `${baseUrl}&topic0=${castVoteTopics[0]}`;
  const revokeActiveLogsUrl = `${baseUrl}&topic0=${revokeActiveTopics[0]}`;
  const revokePendingLogsUrl = `${baseUrl}&topic0=${revokePendingTopics[0]}`;

  // Avoid rate limit by querying in a staggered manner
  const castVoteEvents = await queryCeloscan<TransactionLog[]>(castVoteLogsUrl);
  await sleep(500);
  const revokeActiveEvents = await queryCeloscan<TransactionLog[]>(revokeActiveLogsUrl);
  await sleep(500);
  const revokePendingEvents = await queryCeloscan<TransactionLog[]>(revokePendingLogsUrl);

  const stakerToVotes: Record<Address, number> = {};
  reduceLogs(stakerToVotes, castVoteEvents, true);
  reduceLogs(stakerToVotes, revokeActiveEvents, false);
  reduceLogs(stakerToVotes, revokePendingEvents, false);

  // Filter out stakers who have already revoked all votes
  return objFilter(stakerToVotes, (_, votes): votes is number => votes > 0);
}

function reduceLogs(
  stakerToVotes: Record<Address, number>,
  logs: TransactionLog[],
  isAdd: boolean,
) {
  for (const event of logs) {
    try {
      if (!event.topics || event.topics.length < 3) continue;
      const { eventName, args } = decodeEventLog({
        abi: electionABI,
        data: event.data,
        // @ts-ignore https://github.com/wevm/viem/issues/381
        topics: event.topics,
        strict: false,
      });
      if (
        eventName !== 'ValidatorGroupVoteCast' &&
        eventName !== 'ValidatorGroupPendingVoteRevoked' &&
        eventName !== 'ValidatorGroupActiveVoteRevoked'
      )
        continue;
      const { account: staker, value: valueWei } = args;
      if (!valueWei || !staker || !isValidAddress(staker)) continue;
      const value = fromWei(valueWei);
      if (isAdd) {
        stakerToVotes[staker] = (stakerToVotes[staker] ?? 0) + value;
      } else {
        stakerToVotes[staker] = (stakerToVotes[staker] ?? 0) - value;
      }
    } catch (error) {
      logger.warn('Error decoding event log', error, event);
    }
  }
}
