import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { DelegationBalances } from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useDelegationBalances(address?: Address) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useDelegationBalances', publicClient, address],
    queryFn: async () => {
      if (!address || !publicClient) return null;
      logger.debug('Fetching delegation balances');
      return fetchDelegationBalances(publicClient, address);
    },
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
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
    args: [address],
  });

  // If there are none, stop here
  if (!delegateeAddresses.length) return result;

  // Prepare a list of account, delegatee tuples
  const accountAndDelegatee = delegateeAddresses.map((a) => [address, a]);

  const delegatedAmounts = await publicClient.multicall({
    contracts: accountAndDelegatee.map(
      ([acc, del]) =>
        ({
          address: Addresses.LockedGold,
          abi: lockedGoldABI,
          functionName: 'getDelegatorDelegateeInfo',
          args: [acc, del],
        }) as const,
    ),
  });

  for (let i = 0; i < delegateeAddresses.length; i++) {
    const delegateeAddress = delegateeAddresses[i];
    const amounts = delegatedAmounts[i];
    if (amounts.status !== 'success') throw new Error('Delegated amount call failed');
    const [percent, amount] = amounts.result as [bigint, bigint];
    result.delegateeToAmount[delegateeAddress] = {
      percent: Number(percent),
      amount,
    };
    result.totalAmount += amount;
    result.totalPercent += Number(percent);
  }

  return result;
}
