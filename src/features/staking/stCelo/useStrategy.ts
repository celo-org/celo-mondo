import { useToastError } from 'src/components/notifications/useToastError';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { useStakingMode } from 'src/utils/useStakingMode';
import { useReadContract } from 'wagmi';

export function useStrategy(address?: Address) {
  const { mode } = useStakingMode();
  const { isLoading, isError, error, data, refetch } = useReadContract({
    address: ManagerABI.address,
    abi: ManagerABI.abi,
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
