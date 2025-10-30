import { useToastError } from 'src/components/notifications/useToastError';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { useStakingMode } from 'src/utils/useStakingMode';
import { TransactionReceipt } from 'viem';
import { useReadContract } from 'wagmi';

export function useStrategy(address?: Address) {
  const { mode } = useStakingMode();
  const { isLoading, isError, error, data, refetch } = useReadContract({
    ...ManagerABI,
    functionName: 'getAddressStrategy',
    args: [address!],
    query: {
      enabled: Boolean(address) && mode === 'stCELO',
    },
  });

  useToastError(error, 'Error fetching current strategy');

  return {
    isLoading,
    isError,
    group: data,
    refetch,
  };
}

export function useChangeStrategy(callback: (receipt: TransactionReceipt) => any) {
  const { writeContract } = useWriteContractWithReceipt('liquid stake activation', callback, true);

  const changeStrategy = (group: Address) => {
    writeContract({
      ...ManagerABI,
      functionName: 'changeStrategy',
      args: [group],
    });
  };

  return { changeStrategy };
}

// export function usePendingStakingActivations(address?: Address, groupToStake: GroupToStake = {}) {
//   const pendingGroups = objKeys(groupToStake).filter((group) => groupToStake[group].pending > 0n);

//   const {
//     data: hasActivatable,
//     isError,
//     isLoading,
//     error,
//     refetch,
//   } = useReadContracts({
//     contracts: pendingGroups.map(
//       (g) =>
//         ({
//           address: Addresses.Election,
//           abi: electionABI,
//           functionName: 'hasActivatablePendingVotes',
//           args: [address || ZERO_ADDRESS, g],
//         }) as const,
//     ),
//     allowFailure: true,
//     query: {
//       enabled: !!address && pendingGroups.length > 0,
//       gcTime: GCTime.Default,
//       staleTime: StaleTime.Default,
//     },
//   });

//   const activatableGroups = pendingGroups.filter((_v, i) => !!hasActivatable?.[i].result);
//   const groupToIsActivatable = objMap(groupToStake, (g) => activatableGroups.includes(g));

//   useToastError(error, 'Error fetching pending stake activations');

//   return {
//     activatableGroups,
//     groupToIsActivatable,
//     isError,
//     isLoading,
//     refetch,
//   };
// }
