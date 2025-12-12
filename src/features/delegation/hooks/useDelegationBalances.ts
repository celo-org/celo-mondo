import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { DelegationBalances } from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';
import { fromFixidity } from 'src/utils/numbers';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useDelegationBalances(address?: Address, voteSigner?: Address) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useDelegationBalances', publicClient, address, voteSigner],
    queryFn: async () => {
      if (!address || !publicClient) return null;

      logger.debug('Fetching delegation balances');
      return fetchDelegationBalances(publicClient, address, voteSigner);
    },
    gcTime: GCTime.Shortest,
    staleTime: StaleTime.Short,
  });

  useToastError(error, 'Error fetching delegation balances');

  return {
    isLoading,
    isError,
    delegations: data || undefined,
    refetch,
  };
}

async function fetchDelegationBalances(
  publicClient: PublicClient,
  address: Address,
  voteSignerForAddress?: Address,
): Promise<DelegationBalances> {
  const result: DelegationBalances = {
    totalPercent: 0,
    totalAmount: 0n,
    delegateeToAmount: {},
  };

  // First fetch the list of delegatees addresses
  const delegateeAddresses = await publicClient.readContract({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getDelegateesOfDelegator',
    args: [voteSignerForAddress || address],
  });

  // If there are none, stop here
  if (!delegateeAddresses.length) return result;

  const delegatedAmounts = await publicClient.multicall({
    contracts: delegateeAddresses.map(
      (del) =>
        ({
          address: Addresses.LockedGold,
          abi: lockedGoldABI,
          functionName: 'getDelegatorDelegateeInfo',
          args: [voteSignerForAddress || address, del],
        }) as const,
    ),
  });

  for (let i = 0; i < delegateeAddresses.length; i++) {
    const delegateeAddress = delegateeAddresses[i];
    const amounts = delegatedAmounts[i];
    if (amounts.status !== 'success') throw new Error('Delegated amount call failed');
    const [fixidityPercent, amount] = amounts.result as [bigint, bigint];
    const percent = fromFixidity(fixidityPercent) * 100;
    result.delegateeToAmount[delegateeAddress] = {
      percent,
      amount,
    };
    result.totalAmount += amount;
    result.totalPercent += percent;
  }

  return result;
}
