import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { fetchProposals } from 'src/features/governance/fetchProposals';
import { getExpiryTimestamp, MergedProposalData } from 'src/features/governance/governanceData';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { usePublicClient } from 'wagmi';

export function useGovernanceProposal(id?: number) {
  const { proposals } = useGovernanceProposals();
  if (!id || !proposals) return undefined;
  return proposals.find((p) => p.id === id);
}

function useGovernanceDrafts() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceDrafts', publicClient],
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
    gcTime: GCTime.Long,
    staleTime: StaleTime.Long,
  });
  useToastError(error, 'Error fetching governance drafts');

  return {
    isLoading,
    isError,
    drafts: data || undefined,
  };
}

export function useGovernanceProposals() {
  const publicClient = usePublicClient();
  const draftsResults = useGovernanceDrafts();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useGovernanceProposals', publicClient],
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching governance proposals');
      // Fetch on-chain data
      const proposals = await fetchProposals(publicClient.chain!.id);
      return proposals.map((proposal) => ({
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
          votes: proposal.votes,
        },
        proposal: {
          deposit: proposal.deposit,
          id: proposal.id,
          networkWeight: proposal.networkWeight,
          numTransactions: BigInt(proposal.transactionCount || 0),
          stage: proposal.stage,
          proposer: proposal.proposer,
          upvotes: 0n, // TODO
          url: proposal.url,
          expiryTimestamp: getExpiryTimestamp(proposal.stage, proposal.timestamp * 1000),
          timestamp: proposal.timestamp * 1000,
          isApproved: proposal.stage > ProposalStage.Approval,
          votes: proposal.votes,
        },
      })) as MergedProposalData[];
    },
    gcTime: GCTime.Long,
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

    return proposals_?.sort((a, b) => b.metadata!.cgp - a.metadata!.cgp);
  }, [draftsResults.drafts, data]);

  return {
    isLoading,
    isError,
    proposals,
  };
}
