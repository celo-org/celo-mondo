import { governanceABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useReadContract } from 'wagmi';

export function useIsGovernanceVoting(address?: Address) {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'isVoting',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching voting status');

  return {
    isVoting: data,
    isError,
    isLoading,
  };
}
