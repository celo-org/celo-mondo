import { electionABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { GroupToStake } from 'src/features/staking/types';
import { useWriteContractWithReceipt } from 'src/features/transactions/hooks';
import { objKeys, objMap } from 'src/utils/objects';
import { useReadContracts } from 'wagmi';

export function usePendingStakingActivations(address?: Address, groupToStake: GroupToStake = {}) {
  const pendingGroups = objKeys(groupToStake).filter((group) => groupToStake[group].pending > 0n);

  const {
    data: hasActivatable,
    isError,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: pendingGroups.map((g) => ({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'hasActivatablePendingVotes',
      args: [address || ZERO_ADDRESS, g],
    })),
    allowFailure: true,
    query: {
      enabled: !!address && pendingGroups.length > 0,
      gcTime: Infinity,
      staleTime: 60 * 60 * 1000, // 1 hour
    },
  });

  // @ts-ignore Bug with viem 2.0 multicall types
  const activatableGroups = pendingGroups.filter((_v, i) => !!hasActivatable?.[i].result);
  const groupToIsActivatable = objMap(groupToStake, (g) => activatableGroups.includes(g));

  useToastError(error, 'Error fetching pending stake activations');

  return {
    activatableGroups,
    groupToIsActivatable,
    isError,
    isLoading,
    refetch,
  };
}

export function useActivateStake(refetchStakeData: () => any) {
  const { writeContract } = useWriteContractWithReceipt('stake activation', refetchStakeData, true);

  const activateStake = (group: Address) => {
    writeContract({
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'activate',
      args: [group],
    });
  };

  return { activateStake };
}
