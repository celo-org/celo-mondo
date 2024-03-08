import { governanceABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { DEQUEUE_FREQUENCY } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useGovernanceProposals } from 'src/features/governance/hooks/useGovernanceProposals';
import { ProposalStage, UpvoteRecord } from 'src/features/governance/types';
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
export function useQueueHasReadyProposals() {
  const { proposals, isLoading } = useGovernanceProposals();

  const readyQueuedProposals = proposals?.filter(
    (p) =>
      p.proposal?.stage === ProposalStage.Queued &&
      Date.now() - p.proposal?.timestamp > DEQUEUE_FREQUENCY,
  );

  return {
    isLoading,
    hasReadyProposals: !!readyQueuedProposals?.length,
  };
}
