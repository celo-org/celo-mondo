import { governanceABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useContractRead } from 'wagmi';

export function useIsGovernanceVoting(address?: Address) {
  const { data, isError, isLoading, error } = useContractRead({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'isVoting',
    args: [address || ZERO_ADDRESS],
    enabled: !!address,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  useToastError(error, 'Error fetching voting status');

  return {
    isVoting: data,
    isError,
    isLoading,
  };
}
