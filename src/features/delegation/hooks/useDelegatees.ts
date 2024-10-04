import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { Delegatee, DelegateeMetadata } from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';
import { fromFixidity } from 'src/utils/numbers';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useDelegatees() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useDelegatees', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching delegatees');
      const cachedMetadata = Object.values(getDelegateeMetadata());
      const addressToDelegatee = await fetchDelegateeStats(publicClient, cachedMetadata);
      const delegatees = Object.values(addressToDelegatee);
      return { addressToDelegatee, delegatees };
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, `Error fetching delegate data, ${error?.message}`);

  return {
    isLoading,
    isError,
    delegatees: data?.delegatees,
    addressToDelegatee: data?.addressToDelegatee,
  };
}

async function fetchDelegateeStats(
  publicClient: PublicClient,
  metadata: DelegateeMetadata[],
): Promise<AddressTo<Delegatee>> {
  const lockedBalanceResults = await publicClient.multicall({
    contracts: metadata.map(
      (d) =>
        ({
          address: Addresses.LockedGold,
          abi: lockedGoldABI,
          functionName: 'getAccountTotalLockedGold',
          args: [d.address],
        }) as const,
    ),
  });

  const votingPowerResults = await publicClient.multicall({
    contracts: metadata.map(
      (d) =>
        ({
          address: Addresses.LockedGold,
          abi: lockedGoldABI,
          functionName: 'getAccountTotalGovernanceVotingPower',
          args: [d.address],
        }) as const,
    ),
  });

  const delegatedFractionResults = await publicClient.multicall({
    contracts: metadata.map(
      (d) =>
        ({
          address: Addresses.LockedGold,
          abi: lockedGoldABI,
          functionName: 'getAccountTotalDelegatedFraction',
          args: [d.address],
        }) as const,
    ),
  });

  // Process validator lists to create list of validator groups
  const delegatees: AddressTo<Delegatee> = {};
  for (let i = 0; i < metadata.length; i++) {
    const address = metadata[i].address as Address;

    const lockedBalanceRes = lockedBalanceResults[i];
    const votingPowerRes = votingPowerResults[i];
    const delegatedFractionRes = delegatedFractionResults[i];

    if (
      lockedBalanceRes.status !== 'success' ||
      votingPowerRes.status !== 'success' ||
      delegatedFractionRes.status !== 'success'
    )
      throw new Error('Error fetching delegatee stats');

    const lockedBalance = lockedBalanceRes.result as bigint;
    const votingPower = votingPowerRes.result as bigint;
    const votingPowerMinusLockedBalance = votingPower - lockedBalance;
    const delegatedByPercent = fromFixidity(delegatedFractionRes.result as bigint) * 100;

    delegatees[address] = {
      ...metadata[i],
      address,
      lockedBalance,
      votingPower,
      delegatedToBalance: votingPowerMinusLockedBalance > 0 ? votingPowerMinusLockedBalance : 0n,
      delegatedByPercent,
    };
  }

  return delegatees;
}
