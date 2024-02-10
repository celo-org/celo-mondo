import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { GovernanceProposal, ProposalStage, VoteValue } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { MulticallReturnType, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useGovernanceProposals() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceProposals', publicClient],
    queryFn: () => {
      if (!publicClient) return null;
      logger.debug('Fetching governance proposals');
      return fetchGovernanceProposals(publicClient);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching governance proposals');

  return {
    isLoading,
    isError,
    proposals: data || undefined,
  };
}

// proposer, deposit, timestamp, txLength, url
type ProposalRaw = [Address, bigint, bigint, bigint, string];
// Yes, no, abstain
type VoteTotalsRaw = [bigint, bigint, bigint];

async function fetchGovernanceProposals(publicClient: PublicClient): Promise<GovernanceProposal[]> {
  // Get queued and dequeued proposals
  const [queued, dequeued] = await publicClient.multicall({
    contracts: [
      {
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getQueue',
      },
      {
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getDequeue',
      },
    ],
  });

  if (queued.status !== 'success' || dequeued.status !== 'success') {
    throw new Error('Error fetching proposal IDs');
  }

  const [queuedIds, queuedUpvotes] = queued.result;
  const dequeuedIds = dequeued.result;
  const allIdsAndUpvotes = [
    ...queuedIds.map((id, i) => ({ id, upvotes: queuedUpvotes[i] })),
    ...dequeuedIds.map((id) => ({ id, upvotes: 0n })),
  ];

  if (!allIdsAndUpvotes.length) return [];

  // @ts-ignore TODO Bug with viem 2.0 multicall types
  const metadatas: MulticallReturnType<any> = await publicClient.multicall({
    contracts: allIdsAndUpvotes.map((p) => ({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getProposal',
      args: [p.id],
    })),
  });

  // @ts-ignore TODO Bug with viem 2.0 multicall types
  const stages: MulticallReturnType<any> = await publicClient.multicall({
    contracts: allIdsAndUpvotes.map((p) => ({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getProposalStage',
      args: [p.id],
    })),
  });

  // @ts-ignore TODO Bug with viem 2.0 multicall types
  const votes: MulticallReturnType<any> = await publicClient.multicall({
    contracts: allIdsAndUpvotes.map((p) => ({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getVoteTotals',
      args: [p.id],
    })),
  });

  const proposals: GovernanceProposal[] = [];
  for (let i = 0; i < allIdsAndUpvotes.length; i++) {
    const { id, upvotes } = allIdsAndUpvotes[i];
    const metadata = metadatas[i];
    const proposalStage = stages[i];
    const vote = votes[i];

    if (!metadata.result || !proposalStage.result || !vote.result) {
      logger.warn('Missing proposal metadata, stage, or vote totals for ID', id);
      continue;
    }

    const [proposer, deposit, timestamp, _txLength, url] = metadata.result as ProposalRaw;
    const [yes, no, abstain] = vote.result as VoteTotalsRaw;
    const stage = proposalStage.result as ProposalStage;

    proposals.push({
      id: Number(id),
      timestamp: Number(timestamp) * 1000,
      proposer,
      deposit,
      url,
      stage,
      upvotes,
      votes: {
        [VoteValue.Yes]: yes,
        [VoteValue.No]: no,
        [VoteValue.Abstain]: abstain,
      },
    });
  }

  return proposals;
}
