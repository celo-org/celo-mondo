import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import type { getProposals } from 'src/features/governance/getProposals';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { getExpiryTimestamp, MergedProposalData } from 'src/features/governance/governanceData';
import {
  ProposalMetadata,
  ProposalStage,
  VoteAmounts,
  VoteType,
} from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { sortByIdThenCGP } from 'src/utils/proposals';
import { usePublicClient } from 'wagmi';

export function useGovernanceProposal(id?: number) {
  const { proposals } = useGovernanceProposals();
  if (!id || !proposals) return undefined;
  return proposals.find((p) => p.id === id);
}

function useGovernanceDrafts() {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceDrafts'],
    queryFn: async () => {
      logger.debug('Fetching governance drafts');

      const cached = (await import('src/config/proposals.json')).default as ProposalMetadata[];
      return fetchProposalsFromRepo(cached, false);
    },
    select(data) {
      return data.map((draft) => ({
        stage: draft.stage,
        metadata: draft,
      })) as MergedProposalData[];
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
  });
  useToastError(error, 'Error fetching governance drafts');

  return {
    isLoading,
    isError,
    drafts: data || undefined,
  };
}

export function useGovernanceVotes() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceVotes', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching governance votes');
      const votes: Awaited<ReturnType<typeof getProposalVotes>> = await fetch(
        `/api/governance/votes?chainId=${publicClient.chain!.id}`,
      ).then((x) => x.json());
      return votes;
    },
    gcTime: GCTime.Short,
    staleTime: StaleTime.Short,
  });
  useToastError(error, 'Error fetching governance votes');
  return {
    isLoading,
    isError,
    votes: data || undefined,
  };
}

export function useGovernanceProposals() {
  const publicClient = usePublicClient();
  const draftsResults = useGovernanceDrafts();
  const votesResults = useGovernanceVotes();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceProposals', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching governance proposals');
      // Fetch on-chain data
      const proposals: Awaited<ReturnType<typeof getProposals>> = await fetch(
        `/api/governance/proposals?chainId=${publicClient.chain!.id}`,
      ).then((x) => x.json());

      const [ids, upvotesArr] = await publicClient.readContract({
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getQueue',
      });

      return proposals.map((proposal) => {
        const queuedId = ids.indexOf(BigInt(proposal.id));
        let upvotes = 0n;
        if (queuedId !== -1) {
          upvotes = upvotesArr.at(queuedId)!;
        }
        return {
          id: proposal.id,
          stage: proposal.stage,
          history: proposal.history,
          metadata: {
            author: proposal.author,
            cgp: proposal.cgp,
            cgpUrl: proposal.cgpUrl,
            cgpUrlRaw: proposal.cgpUrlRaw,
            stage: proposal.stage,
            title: proposal.title,
            timestamp: proposal.timestamp * 1000,
            timestampExecuted: proposal.executedAt ? proposal.executedAt * 1000 : null,
            id: proposal.id,
            url: proposal.url,
          },
          proposal: {
            deposit: BigInt(proposal.deposit || 0),
            id: proposal.id,
            networkWeight: BigInt(proposal.networkWeight || 0),
            numTransactions: BigInt(proposal.transactionCount || 0),
            stage: proposal.stage,
            proposer: proposal.proposer,
            upvotes,
            url: proposal.url,
            expiryTimestamp: getExpiryTimestamp(proposal.stage, proposal.timestamp * 1000),
            timestamp: proposal.timestamp * 1000,
            // approve only if the proposal has progressed past referendum and not been rejected
            isApproved:
              proposal.stage === ProposalStage.Execution ||
              proposal.stage === ProposalStage.Executed,
            votes: {},
          },
        } as MergedProposalData;
      });
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching governance proposals');

  const proposals = useMemo(() => {
    const onChainCgps = data?.map((x) => x.metadata!.cgp);
    const proposals_ =
      draftsResults.drafts && data
        ? draftsResults.drafts
            .filter((draft) => !onChainCgps?.includes(draft.metadata!.cgp))
            .concat(data)
        : data;

    proposals_?.forEach((proposal) => {
      const votes = votesResults.votes?.[proposal.id!];
      computeStageAndVotes(proposal, votes);
    });
    return sortByIdThenCGP(proposals_);
  }, [draftsResults.drafts, data, votesResults.votes]);

  return {
    isLoading,
    isError,
    proposals,
  };
}

function computeStageAndVotes(mergedProposalData: MergedProposalData, votes?: VoteAmounts) {
  if (!mergedProposalData.proposal) return;

  const { proposal, metadata } = mergedProposalData;
  proposal!.votes = votes ?? {
    [VoteType.Yes]: 0n,
    [VoteType.No]: 0n,
    [VoteType.Abstain]: 0n,
  };

  if (votes) {
    // normalise bigint vote totals
    Object.keys(proposal.votes).forEach((voteType) => {
      proposal.votes[voteType as keyof VoteAmounts] = BigInt(
        proposal.votes[voteType as keyof VoteAmounts],
      );
    });

    // compute rejected stage if expired and majority of votes are "No"
    let computedStage = proposal.stage;
    if (proposal.stage === ProposalStage.Expiration) {
      const yesVotes = proposal.votes[VoteType.Yes];
      const noVotes = proposal.votes[VoteType.No];
      if (noVotes >= yesVotes) {
        computedStage = ProposalStage.Rejected;
      }
    }

    // mutate proposal object with computed stage
    if (computedStage !== proposal.stage) {
      mergedProposalData.stage = computedStage;
      proposal.stage = computedStage;
      proposal.expiryTimestamp = getExpiryTimestamp(computedStage, proposal.timestamp * 1000);
      proposal.isApproved =
        proposal.stage === ProposalStage.Execution || proposal.stage === ProposalStage.Executed;
      if (metadata) metadata.stage = computedStage;
    }
  }
}
