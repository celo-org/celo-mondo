import { governanceABI } from '@celo/abis';
import { cache } from 'react';
import { Addresses } from 'src/config/contracts';
import { parseProposalContent } from 'src/features/governance/fetchFromRepository';
import { getProposals, ProposalWithHistory } from 'src/features/governance/getProposals';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import {
  MergedProposalData,
  mergeProposalWithChainData,
} from 'src/features/governance/governanceData';
import { ProposalStage, VoteAmounts, VoteType } from 'src/features/governance/types';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';

const CGP_RAW_URL_BASE = 'https://raw.githubusercontent.com/celo-org/governance/main/CGPs/cgp-';
const CONTENT_REVALIDATE_SECONDS = 300;

/**
 * Server-side variant of useGovernanceProposals' data so pages render content
 * for crawlers. Vote totals come from the database; upvotes and isPassing are
 * read on-chain for the (few) queued/referendum proposals. The client still
 * refetches everything after hydration. Returns null on failure so pages can
 * fall back to client-side fetching. Wrapped in React cache() to dedupe
 * between generateMetadata and the page render.
 */
export const getServerSideProposals = cache(
  async (chainId: number): Promise<MergedProposalData[] | null> => {
    try {
      const [proposals, votes] = await Promise.all([
        getProposals(chainId),
        getProposalVotes(chainId).catch((error): null => {
          logger.error('Failed to fetch proposal votes server-side', error);
          return null;
        }),
      ]);
      const chainData = await fetchActiveProposalChainData(proposals).catch((error): null => {
        logger.error('Failed to fetch active proposal chain data server-side', error);
        return null;
      });

      return proposals.map((proposal) => {
        const merged = mergeProposalWithChainData(proposal, {
          upvotes: chainData?.upvotes[proposal.id] ?? 0n,
          isPassing: chainData?.isPassing[proposal.id] ?? false,
        });
        const proposalVotes = votes?.[proposal.id];
        if (merged.proposal && proposalVotes) {
          merged.proposal.votes = normalizeVoteAmounts(proposalVotes);
        }
        return merged;
      });
    } catch (error) {
      logger.error('Failed to fetch proposals server-side', error);
      return null;
    }
  },
);

function normalizeVoteAmounts(votes: VoteAmounts): VoteAmounts {
  return {
    [VoteType.Yes]: BigInt(votes[VoteType.Yes] ?? 0),
    [VoteType.No]: BigInt(votes[VoteType.No] ?? 0),
    [VoteType.Abstain]: BigInt(votes[VoteType.Abstain] ?? 0),
  };
}

// Upvotes exist only for queued proposals (one getQueue read) and isPassing
// only matters for referendum proposals (typically zero to a few), so the
// on-chain cost per render stays small.
async function fetchActiveProposalChainData(proposals: ProposalWithHistory[]) {
  const upvotes: Record<number, bigint> = {};
  const isPassing: Record<number, boolean> = {};

  const hasQueued = proposals.some((p) => p.stage === ProposalStage.Queued);
  const referendum = proposals.filter((p) => p.stage === ProposalStage.Referendum);

  if (hasQueued) {
    const [ids, upvotesArr] = await celoPublicClient.readContract({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getQueue',
    });
    ids.forEach((id, i) => {
      upvotes[Number(id)] = upvotesArr[i] ?? 0n;
    });
  }

  if (referendum.length) {
    const results = await Promise.all(
      referendum.map((p) =>
        celoPublicClient.readContract({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'isProposalPassing',
          args: [BigInt(p.id)],
        }),
      ),
    );
    referendum.forEach((p, i) => {
      isPassing[p.id] = results[i];
    });
  }

  return { upvotes, isPassing };
}

/**
 * Fetches and renders a CGP's markdown body to sanitized HTML on the server.
 * Returns null on failure so the client content hook can retry.
 */
export const getServerSideProposalContent = cache(
  async (cgpNumber: number): Promise<string | null> => {
    try {
      const url = `${CGP_RAW_URL_BASE}${String(cgpNumber).padStart(4, '0')}.md`;
      const response = await fetch(url, { next: { revalidate: CONTENT_REVALIDATE_SECONDS } });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const rawFile = await response.text();
      return parseProposalContent(rawFile, cgpNumber);
    } catch (error) {
      logger.error('Failed to fetch proposal content server-side', cgpNumber, error);
      return null;
    }
  },
);
