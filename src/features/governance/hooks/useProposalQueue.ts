import { governanceABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { DEQUEUE_FREQUENCY } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { UpvoteRecord } from 'src/features/governance/types';
import { useReadContract } from 'wagmi';

// Returns the upvote records for queued governance proposals
export function useProposalQueue() {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getQueue',
    query: {
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching proposal queue');

  let queue: Array<UpvoteRecord> | undefined = undefined;
  if (data) {
    const ids = data[0];
    const upvotes = data[1];
    queue = ids.map((id, i) => ({ proposalId: Number(id), upvotes: BigInt(upvotes[i] || 0n) }));
  }

  return {
    queue,
    isError,
    isLoading,
  };
}

// Returns the proposal IDs current dequeued from the governance queue
export function useProposalDequeue() {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'getDequeue',
    query: {
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  useToastError(error, 'Error fetching proposal dequeue');

  const dequeue = data?.map((id) => Number(id));

  return {
    dequeue,
    isError,
    isLoading,
  };
}

// Checks if the queue has proposals that are ready to be dequeued
// This is important because currently, upvote txs don't work in this scenario
// because the act of upvoting would trigger a dequeue
export function useIsDequeueReady() {
  const { data, isLoading } = useReadContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'lastDequeue',
    query: {
      staleTime: 1 * 60 * 1000, // 1 minute
    },
  });

  // Fallback to true if data isn't ready to prevent flash of upvote button
  const isDequeueReady = data ? Date.now() - Number(data) * 1000 > DEQUEUE_FREQUENCY : true;

  return {
    isDequeueReady,
    isLoading,
  };
}
