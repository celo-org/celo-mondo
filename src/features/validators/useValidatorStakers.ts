import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { queryCeloBlockscoutLogs } from 'src/features/explorers/blockscout';
import { TransactionLog } from 'src/features/explorers/types';
import { isValidAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog, encodeEventTopics } from 'viem';
import { useReadContracts } from 'wagmi';

export function useValidatorStakers(group?: Address) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useValidatorStakers', group],
    queryFn: () => {
      if (!group) return null;
      logger.debug(`Fetching stakers for group ${group}`);
      return fetchValidatorGroupStakers(group);
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching group stakers');

  const accounts = Object.keys(data ?? {}) as Address[];

  // because of rewards the amount in logs will be slightly off. so refetch the exact amounts.
  // note this does leave off pending but pending is not active yet so i argue its correct
  const accurateStakes = useReadContracts({
    query: {
      enabled: !isLoading && !!data && !!group,
      gcTime: GCTime.Default,
      staleTime: StaleTime.Default,
    },
    contracts: accounts.map(
      (account) =>
        ({
          address: Addresses.Election,
          abi: electionABI,
          functionName: 'getActiveVotesForGroupByAccount',
          args: [group!, account],
        }) as const,
    ),
  });

  let aggregateData: Array<[Address, number]> = [];
  if (accurateStakes.isSuccess && accurateStakes.data) {
    aggregateData = accurateStakes.data
      .filter(({ status }) => status === 'success')
      .map(({ result }, index) => {
        const address = accounts[index];
        const staked = result;
        return [address, fromWei(staked as unknown as bigint)];
      });
  }
  useToastError(accurateStakes.error, 'Error fetching staked amounts');

  return {
    isLoading: isLoading || accurateStakes.isLoading,
    isError: isError || accurateStakes.isError,
    stakers: aggregateData,
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
  const castVoteEvents = await queryCeloBlockscoutLogs(Addresses.Election, castVoteParams);
  await sleep(250);
  const revokeActiveEvents = await queryCeloBlockscoutLogs(Addresses.Election, revokeActiveParams);
  await sleep(250);
  const revokePendingEvents = await queryCeloBlockscoutLogs(
    Addresses.Election,
    revokePendingParams,
  );

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
