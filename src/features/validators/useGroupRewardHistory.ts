import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { infuraRpcUrl } from 'src/config/config';
import { EPOCH_DURATION_MS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanPath } from 'src/features/explorers/celoscan';
import { logger } from 'src/utils/logger';
import { PublicClient, createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem';
import { celo } from 'viem/chains';
import { usePublicClient } from 'wagmi';

const REWARD_DISTRIBUTED_ABI_FRAGMENT =
  'event EpochRewardsDistributedToVoters(address indexed group, uint256 value)';

export function useGroupRewardHistory(group?: Address, epochs?: number) {
  const publicClient = usePublicClient();
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGroupRewardHistory', group, epochs, publicClient],
    queryFn: () => {
      if (!group || !epochs || !publicClient) return null;
      logger.debug(`Fetching reward history for group ${group}`);
      return fetchValidatorGroupRewardHistory(group, epochs, publicClient);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching group reward history');

  return {
    isLoading,
    isError,
    rewardHistory: data || undefined,
  };
}

async function fetchValidatorGroupRewardHistory(
  group: Address,
  epochs: number,
  _publicClient: PublicClient,
): Promise<Array<{ blockNumber: number; reward: bigint; timestamp: number }>> {
  // Get block number of epoch to start from
  const startTimestamp = Math.floor((Date.now() - (epochs + 1) * EPOCH_DURATION_MS) / 1000);
  const blockQueryPath = `/api?module=block&action=getblocknobytime&timestamp=${startTimestamp}&closest=before`;
  const blockNumberStr = await queryCeloscanPath<string>(blockQueryPath);
  const startingBlockNumber = parseInt(blockNumberStr);

  // NOTE(Rossy): I initially tried using celoscan and blockscout to fetch the reward
  // logs but neither supplied them. It must be a bug related to something special about
  // rewards on Celo. Forno can't provide logs for such a large window so instead I
  // hack together a batch-enabled infra provider for this query.
  // Batch is required to fetch the block timestamps en-masse quickly.

  // const topics = encodeEventTopics({
  //   abi: electionABI,
  //   eventName: 'EpochRewardsDistributedToVoters',
  //   args: { group },
  // });
  // const topics = encodeEventTopics({
  //   abi: validatorsABI,
  //   eventName: 'ValidatorEpochPaymentDistributed',
  //   args: { group },
  // });
  // const rewardLogsUrl = `${links.celoscanApi}/api?module=logs&action=getLogs&fromBlock=${startingBlockNumber}&toBlock=latest&address=${Addresses.Election}&topic0=${topics[0]}&topic1=${topics[1]}&topic0_1_opr=and`;
  // const rewardLogs = await queryCeloscan<TransactionLog[]>(rewardLogsUrl);

  const infuraBatchTransport = http(infuraRpcUrl, {
    batch: { wait: 100, batchSize: 1000 },
  });
  const infuraBatchClient = createPublicClient({
    chain: celo,
    transport: infuraBatchTransport,
  });

  const rewardLogs = await infuraBatchClient.getLogs({
    address: Addresses.Election,
    fromBlock: BigInt(startingBlockNumber),
    toBlock: 'latest',
    event: parseAbiItem(REWARD_DISTRIBUTED_ABI_FRAGMENT),
    args: { group },
  });

  // TODO consider estimating date based on block number here instead of making so many calls
  // Infura appears to be unreliable with these
  const rewards: Array<{ blockNumber: number; reward: bigint }> = [];
  for (const log of rewardLogs) {
    try {
      if (!log.topics?.length || log.topics.length < 2) continue;
      const { eventName, args } = decodeEventLog({
        abi: electionABI,
        data: log.data,
        // @ts-ignore https://github.com/wevm/viem/issues/381
        topics: log.topics,
        strict: false,
      });
      if (eventName !== 'EpochRewardsDistributedToVoters' || !args.value) continue;
      rewards.push({
        blockNumber: Number(log.blockNumber),
        reward: args.value,
      });
    } catch (error) {
      logger.warn('Error decoding event log', error, log);
    }
  }

  // TODO confirm batch is working, may have broken in v2 upgrade
  // GetBlock calls required to get the timestamps for each block :(
  const blockDetails = await Promise.all(
    rewards.map((r) => infuraBatchClient.getBlock({ blockNumber: BigInt(r.blockNumber) })),
  );
  const rewardsWithTimestamps = rewards.map((r, i) => ({
    ...r,
    timestamp: Number(blockDetails[i].timestamp) * 1000,
  }));

  return rewardsWithTimestamps.sort((a, b) => a.blockNumber - b.blockNumber);
}
