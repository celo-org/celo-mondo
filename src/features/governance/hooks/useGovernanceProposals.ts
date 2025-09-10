import { governanceABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { getProposals } from 'src/features/governance/getProposals';
import { getExpiryTimestamp, MergedProposalData } from 'src/features/governance/governanceData';
import {
  ProposalMetadata,
  ProposalStage,
  VoteAmounts,
  VoteType, // <-- added import
} from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
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
      const proposals = await getProposals(publicClient.chain!.id);
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

        return {
          id: proposal.id,
          stage: computedStage,
          history: proposal.history,
          metadata: {
            author: proposal.author,
            cgp: proposal.cgp,
            cgpUrl: proposal.cgpUrl,
            cgpUrlRaw: proposal.cgpUrlRaw,
            stage: computedStage,
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
            stage: computedStage,
            proposer: proposal.proposer,
            upvotes,
            url: proposal.url,
            expiryTimestamp: getExpiryTimestamp(computedStage, proposal.timestamp * 1000),
            timestamp: proposal.timestamp * 1000,
            // approve only if the proposal has progressed past referendum and not been rejected
            isApproved:
              computedStage === ProposalStage.Execution || computedStage === ProposalStage.Executed,
            votes: proposal.votes,
          },
        } as MergedProposalData;
      });
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
