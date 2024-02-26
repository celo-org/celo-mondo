import { governanceABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { useReadContract } from 'wagmi';

export function useProposalDequeueList() {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getDequeue',
    query: {
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching proposal dequeue list');

  const dequeue = data?.map((id) => Number(id));

  return {
    dequeue,
    isError,
    isLoading,
  };
}
