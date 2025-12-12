import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import type { ProposalWithHistory } from 'src/features/governance/getProposals';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { getStageEndTimestamp, MergedProposalData } from 'src/features/governance/governanceData';
import { ProposalMetadata, VoteAmounts, VoteType } from 'src/features/governance/types';
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
      const [proposals, [ids, upvotesArr]] = await Promise.all([
        fetch(`/api/governance/proposals?chainId=${publicClient.chain!.id}`).then(
          (x) => x.json() as Promise<ProposalWithHistory[]>,
        ),
        publicClient.readContract({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getQueue',
        }),
      ]);

      return await Promise.all(
        proposals.map(async (proposal) => {
          const queuedId = ids.indexOf(BigInt(proposal.id));
          let upvotes = 0n;
          if (queuedId !== -1) {
            upvotes = upvotesArr.at(queuedId)!;
          }

          return {
            ...proposal,
            metadata: {
              author: proposal.author,
              cgp: proposal.cgp,
              cgpUrl: proposal.cgpUrl,
              cgpUrlRaw: proposal.cgpUrlRaw,
              stage: proposal.stage,
              title: proposal.title,
              timestamp: proposal.timestamp * 1000,
              timestampExecuted: proposal.executedAt
                ? new Date(proposal.executedAt).getTime()
                : null,
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
              expiryTimestamp: getStageEndTimestamp(proposal.stage, proposal.timestamp * 1000),
              // deprecated field, prefer <root>.queuedAt, dequeuedAt, etc
              timestamp: proposal.timestamp * 1000,
              isPassing: await publicClient.readContract({
                address: Addresses.Governance,
                abi: governanceABI,
                args: [BigInt(proposal.id)],
                functionName: 'isProposalPassing',
              }),
              votes: {},
            },
          } as MergedProposalData;
        }),
      );
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
      normalizeProposalVotes(proposal, votes);
    });
    return sortByIdThenCGP(proposals_);
  }, [draftsResults.drafts, data, votesResults.votes]);

  return {
    isLoading,
    isError,
    proposals,
  };
}

/**
 * Normalizes vote totals to bigint and assigns them to the proposal.
 * Stage computation removed - stages are now kept current in the database by:
 * 1. Event-based updates (backfill) for Queued, Executed, Expiration
 * 2. Time-based updates (cron) for Referendum → Execution → Expiration transitions
 */
function normalizeProposalVotes(mergedProposalData: MergedProposalData, votes?: VoteAmounts) {
  if (!mergedProposalData.proposal) return;

  const { proposal } = mergedProposalData;
  proposal.votes = votes ?? {
    [VoteType.Yes]: 0n,
    [VoteType.No]: 0n,
    [VoteType.Abstain]: 0n,
  };

  if (votes) {
    // Normalize bigint vote totals
    Object.keys(proposal.votes).forEach((voteType) => {
      proposal.votes[voteType as keyof VoteAmounts] = BigInt(
        proposal.votes[voteType as keyof VoteAmounts],
      );
    });
  }
}
