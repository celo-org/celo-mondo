import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import DelegateeJsonData from 'src/config/delegates.json';
import {
  Delegatee,
  DelegateeMetadata,
  DelegateeMetadataListSchema,
} from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';
import { MulticallReturnType, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useDelegatees() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useDelegatees', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching delegatees');
      const metadata = parseDelegateeMetadata();
      const addressToDelegatee = await fetchDelegateeStats(publicClient, metadata);
      const delegatees = Object.values(addressToDelegatee);
      return { addressToDelegatee, delegatees };
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching delegate data');

  return {
    isLoading,
    isError,
    delegatees: data?.delegatees,
    addressToDelegatee: data?.addressToDelegatee,
  };
}

function parseDelegateeMetadata(): DelegateeMetadata[] {
  try {
    return DelegateeMetadataListSchema.parse(DelegateeJsonData);
  } catch (error) {
    logger.error('Error parsing delegatee metadata', error);
    throw new Error('Invalid delegatee metadata');
  }
}

async function fetchDelegateeStats(
  publicClient: PublicClient,
  metadata: DelegateeMetadata[],
): Promise<AddressTo<Delegatee>> {
  // @ts-ignore TODO Bug with viem 2.0 multicall types
  const lockedBalanceResults: MulticallReturnType<any> = await publicClient.multicall({
    contracts: metadata.map((d) => ({
      address: Addresses.LockedGold,
      abi: lockedGoldABI,
      functionName: 'getAccountTotalLockedGold',
      args: [d.address],
    })),
  });

  // @ts-ignore TODO Bug with viem 2.0 multicall types
  const votingPowerResults: MulticallReturnType<any> = await publicClient.multicall({
    contracts: metadata.map((d) => ({
      address: Addresses.LockedGold,
      abi: lockedGoldABI,
      functionName: 'getAccountTotalGovernanceVotingPower',
      args: [d.address],
    })),
  });

  // Process validator lists to create list of validator groups
  const delegatees: AddressTo<Delegatee> = {};
  for (let i = 0; i < metadata.length; i++) {
    const address = metadata[i].address as Address;

    const lockedBalanceRes = lockedBalanceResults[i];
    const votingPowerRes = votingPowerResults[i];

    if (lockedBalanceRes.status !== 'success' || votingPowerRes.status !== 'success')
      throw new Error('Error fetching delegatee stats');

    const lockedBalance = lockedBalanceRes.result as bigint;
    const votingPower = votingPowerRes.result as bigint;
    const delegatedBalance = votingPower - lockedBalance;

    delegatees[address] = {
      ...metadata[i],
      address,
      lockedBalance,
      votingPower,
      delegatedBalance,
    };
  }

  return delegatees;
}
