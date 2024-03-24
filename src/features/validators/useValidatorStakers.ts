import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanLogs } from 'src/features/explorers/celoscan';
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

async function fetchValidatorGroupStakers(group: Address): Promise<AddressTo<number>> {
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
  const castVoteParams = `topic0=${castVoteTopics[0]}&topic2=${castVoteTopics[2]}&topic0_2_opr=and`;
  const revokeActiveParams = `topic0=${revokeActiveTopics[0]}&topic2=${revokeActiveTopics[2]}&topic0_2_opr=and`;
  const revokePendingParams = `topic0=${revokePendingTopics[0]}&topic2=${revokePendingTopics[2]}&topic0_2_opr=and`;

  // Avoid rate limit by querying in a staggered manner
  const castVoteEvents = await queryCeloscanLogs(Addresses.Election, castVoteParams);
  await sleep(250);
  const revokeActiveEvents = await queryCeloscanLogs(Addresses.Election, revokeActiveParams);
  await sleep(250);
  const revokePendingEvents = await queryCeloscanLogs(Addresses.Election, revokePendingParams);

  const stakerToVotes: AddressTo<number> = {};
  reduceLogs(stakerToVotes, castVoteEvents, true);
  reduceLogs(stakerToVotes, revokeActiveEvents, false);
  reduceLogs(stakerToVotes, revokePendingEvents, false);

  // Filter out stakers who have already revoked all votes
  return objFilter(stakerToVotes, (_, votes): votes is number => votes > 0);
}

function reduceLogs(stakerToVotes: AddressTo<number>, logs: TransactionLog[], isAdd: boolean) {
  for (const log of logs) {
    try {
      if (!log.topics || log.topics.length < 3) continue;
      const { eventName, args } = decodeEventLog({
        abi: electionABI,
        data: log.data,
        // @ts-ignore https://github.com/wevm/viem/issues/381
        topics: log.topics,
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
      stakerToVotes[staker] ||= 0;
      if (isAdd) stakerToVotes[staker] += value;
      else stakerToVotes[staker] -= value;
    } catch (error) {
      logger.warn('Error decoding staking event log', error, log);
    }
  }
}
