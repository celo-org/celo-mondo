import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { queryCeloscanLogs } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { isValidAddress } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { objFilter } from 'src/utils/objects';
import { decodeEventLog, encodeEventTopics } from 'viem';

export function useDelegators(delegateAddress?: Address) {
  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useDelegators', delegateAddress],
    queryFn: () => {
      if (!delegateAddress) return null;
      logger.debug(`Fetching delegators for delegatee ${delegateAddress}`);
      return fetchDelegators(delegateAddress);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching delegator list');

  return {
    isLoading,
    isError,
    delegatorToAmount: data || undefined,
    refetch,
  };
}

async function fetchDelegators(delegateAddress: Address): Promise<AddressTo<bigint>> {
  const delegateTopics = encodeEventTopics({
    abi: lockedGoldABI,
    eventName: 'CeloDelegated',
    args: { delegatee: delegateAddress },
  });

  const revokeTopics = encodeEventTopics({
    abi: lockedGoldABI,
    eventName: 'DelegatedCeloRevoked',
    args: { delegatee: delegateAddress },
  });

  const delegateParams = `topic0=${delegateTopics[0]}&topic2=${delegateTopics[2]}&topic0_2_opr=and`;
  const delegateEvents = await queryCeloscanLogs(Addresses.Governance, delegateParams);

  const revokeParams = `topic0=${revokeTopics[0]}&topic2=${revokeTopics[2]}&topic0_2_opr=and`;
  const revokeEvents = await queryCeloscanLogs(Addresses.Governance, revokeParams);

  const delegatorToAmount: AddressTo<bigint> = {};
  reduceLogs(delegatorToAmount, delegateEvents, true);
  reduceLogs(delegatorToAmount, revokeEvents, false);

  // Filter out accounts with no remaining delegated amount
  return objFilter(delegatorToAmount, (_, amount): amount is bigint => amount > 0n);
}

function reduceLogs(delegatorToAmount: AddressTo<bigint>, logs: TransactionLog[], isAdd: boolean) {
  for (const log of logs) {
    try {
      if (!log.topics || log.topics.length < 3) continue;
      const { eventName, args } = decodeEventLog({
        abi: lockedGoldABI,
        data: log.data,
        // @ts-ignore https://github.com/wevm/viem/issues/381
        topics: log.topics,
        strict: false,
      });

      if (eventName !== 'CeloDelegated' && eventName !== 'DelegatedCeloRevoked') continue;

      const { delegator, amount } = args;
      if (!amount || !delegator || !isValidAddress(delegator)) continue;

      delegatorToAmount[delegator] ||= 0n;
      if (isAdd) delegatorToAmount[delegator] += amount;
      else delegatorToAmount[delegator] -= amount;
    } catch (error) {
      logger.warn('Error decoding delegation event log', error, log);
    }
  }
}
