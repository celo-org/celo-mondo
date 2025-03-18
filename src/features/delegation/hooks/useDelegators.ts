import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanLogs } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { logger } from 'src/utils/logger';
import { Address, PublicClient, decodeEventLog, encodeEventTopics } from 'viem';
import { usePublicClient } from 'wagmi';

/**
 * Fetches all delegators for a given delegate address
 */
export function useDelegators(delegateAddress?: Address) {
  const client = usePublicClient();

  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useDelegators', delegateAddress, client],
    queryFn: () => {
      if (!delegateAddress || !client) {
        return null;
      }

      logger.debug(`Fetching delegators for delegatee ${delegateAddress}`);

      return fetchDelegators(client, delegateAddress);
    },
    gcTime: GCTime.Long,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching delegator list');

  return {
    isLoading,
    isError,
    delegatorToAmount: data || undefined,
    refetch,
  };
}

/**
 * Fetches all delegators for a given delegate address in a form of { address: amount }
 */
async function fetchDelegators(
  client: PublicClient,
  delegateAddress: Address,
): Promise<AddressTo<bigint>> {
  // First we need to fetch all delegation events to gather all possible delegators
  const delegateTopics = encodeEventTopics({
    abi: lockedGoldABI,
    eventName: 'CeloDelegated',
    args: { delegatee: delegateAddress },
  });

  const delegateParams = `topic0=${delegateTopics[0]}&topic2=${delegateTopics[2]}&topic0_2_opr=and`;
  const delegateEvents = await queryCeloscanLogs(Addresses.LockedGold, delegateParams);

  const allDelegators: Address[] = [];
  reduceLogs(allDelegators, delegateEvents);

  // Filter out duplicates
  const allDelegatorsUnique = Array.from(new Set(allDelegators));

  // Fetch the amount of gold delegated by each delegator in parallel
  const allDelegatorsAndAmounts: [string, bigint][] = await Promise.all(
    allDelegatorsUnique.map(async (address) => {
      const [_, amount] = await client.readContract({
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        functionName: 'getDelegatorDelegateeInfo',
        args: [address, delegateAddress],
      });

      return [address, amount];
    }),
  );

  // Filter out delegators with 0 amount (as they might have undelegated)
  return Object.fromEntries(allDelegatorsAndAmounts.filter(([, amount]) => amount > 0n));
}

/**
 * Extracts delegators from the logs and adds them to the delegators array
 */
function reduceLogs(delegators: Address[], logs: TransactionLog[]) {
  for (const log of logs) {
    try {
      if (!log.topics || log.topics.length < 3) {
        continue;
      }

      const { eventName, args } = decodeEventLog({
        abi: lockedGoldABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      });

      if (eventName !== 'CeloDelegated') continue;

      const { delegator } = args;
      if (!delegator) {
        continue;
      }

      delegators.push(delegator);
    } catch (error) {
      logger.warn('Error decoding delegation event log', error, log);
    }
  }
}
