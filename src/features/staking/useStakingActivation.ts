import { electionABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { config } from 'src/config/config';
import { GCTime, StaleTime, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { GroupToStake } from 'src/features/staking/types';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
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
    contracts: pendingGroups.map(
      (g) =>
        ({
          address: Addresses.Election,
          abi: electionABI,
          functionName: 'hasActivatablePendingVotes',
          args: [address || ZERO_ADDRESS, g],
        }) as const,
    ),
    allowFailure: true,
    query: {
      enabled: !!address && pendingGroups.length > 0,
      gcTime: GCTime.Long,
      staleTime: StaleTime.Default,
    },
  });

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
      chainId: config.chain.id,
      abi: electionABI,
      functionName: 'activate',
      args: [group],
    });
  };

  return { activateStake };
}
