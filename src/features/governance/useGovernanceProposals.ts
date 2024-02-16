import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import CachedMetadata from 'src/config/proposals.json';
import {
  FAILED_PROPOSAL_STAGES,
  Proposal,
  ProposalStage,
  VoteValue,
} from 'src/features/governance/contractTypes';
import { ProposalMetadata } from 'src/features/governance/repoTypes';
import { logger } from 'src/utils/logger';
import { MulticallReturnType, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export type MergedProposalData = { stage: ProposalStage } & (
  | { proposal: Proposal; metadata?: ProposalMetadata }
  | { proposal?: Proposal; metadata: ProposalMetadata }
);

export function useGovernanceProposals() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceProposals', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching governance proposals');
      // Fetch on-chain data
      const proposals = await fetchGovernanceProposals(publicClient);
      // Then merge it with the cached
      return mergeProposalsWithMetadata(proposals);
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

async function fetchGovernanceProposals(publicClient: PublicClient): Promise<Proposal[]> {
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

  const proposals: Proposal[] = [];
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

function mergeProposalsWithMetadata(proposals: Proposal[]): Array<MergedProposalData> {
  const sortedMetadata = [...CachedMetadata].sort((a, b) => b.cgp - a.cgp) as ProposalMetadata[];
  const sortedProposals = [...proposals].sort((a, b) => b.id - a.id);
  const merged: Array<MergedProposalData> = [];

  for (const proposal of sortedProposals) {
    const metadataIndex = sortedMetadata.findIndex((m) => m.id === proposal.id);
    if (metadataIndex >= 0) {
      const metadata = sortedMetadata.splice(metadataIndex, 1)[0];
      merged.push({ stage: proposal.stage, proposal, metadata });
    } else {
      merged.push({ stage: proposal.stage, proposal });
    }
  }

  // Merge in any remaining metadata
  for (const metadata of sortedMetadata) {
    merged.push({ stage: metadata.stage, metadata });
  }

  // Push failed proposals without metadata to the back
  return merged.sort((a, b) => {
    if (b.metadata && !a.metadata && isFailed(a.proposal)) return 1;
    else if (a.metadata && !b.metadata && isFailed(b.proposal)) return -1;
    return 0;
  });
}

function isFailed(p?: Proposal | ProposalMetadata) {
  return p && FAILED_PROPOSAL_STAGES.includes(p.stage);
}
