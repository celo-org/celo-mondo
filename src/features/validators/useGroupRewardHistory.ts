import { electionABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { config, infuraRpcUrl } from 'src/config/config';
import { AVG_BLOCK_TIMES_MS, EPOCH_DURATION_MS, GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanPath } from 'src/features/explorers/celoscan';
import { logger } from 'src/utils/logger';
import { Block, createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem';

const REWARD_DISTRIBUTED_ABI_FRAGMENT =
  'event EpochRewardsDistributedToVoters(address indexed group, uint256 value)';

export function useGroupRewardHistory(group?: Address, epochs?: number) {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGroupRewardHistory', group, epochs],
    queryFn: () => {
      if (!group || !epochs) return null;
      logger.debug(`Fetching reward history for group ${group}`);
      return fetchValidatorGroupRewardHistory(group, epochs);
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
    retry: false,
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

  const infuraTransport = http(infuraRpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 20_000,
  });
  const infuraBatchClient = createPublicClient({
    chain: config.chain,
    batch: {
      multicall: true,
    },
    transport: config.chain.testnet ? http() : infuraTransport,
  });

  const rewardLogs = await infuraBatchClient.getLogs({
    address: Addresses.Election,
    fromBlock: BigInt(startingBlockNumber),
    toBlock: 'latest',
    event: parseAbiItem(REWARD_DISTRIBUTED_ABI_FRAGMENT),
    args: { group },
  });

  const latestBlock = await infuraBatchClient.getBlock();

  const rewards: Array<{ reward: bigint; blockNumber: number; timestamp: number }> = [];
  for (const log of rewardLogs) {
    try {
      if (!log.topics?.length || log.topics.length < 2) continue;
      const { eventName, args } = decodeEventLog({
        abi: electionABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      });
      if (eventName !== 'EpochRewardsDistributedToVoters' || !args.value) continue;
      const blockNumber = Number(log.blockNumber);
      rewards.push({
        reward: args.value,
        blockNumber,
        timestamp: estimateBlockTimestamp(blockNumber, latestBlock),
      });
    } catch (error) {
      logger.warn('Error decoding event log', error, log);
    }
  }

  return rewards.sort((a, b) => a.blockNumber - b.blockNumber);
}

// Estimates are sufficient for this purpose
// The alternative is to query for each block's details to get the timestamp
// but that was causing problems for Infura. Batch requests also did not work.
function estimateBlockTimestamp(
  blockNumber: number,
  latestBlock: Pick<Block, 'number' | 'timestamp'>,
) {
  const latestNumber = Number(latestBlock.number);
  const latestTimestamp = Number(latestBlock.timestamp) * 1000;
  const timeDifference = (latestNumber - blockNumber) * AVG_BLOCK_TIMES_MS;
  return latestTimestamp - timeDifference;
}
