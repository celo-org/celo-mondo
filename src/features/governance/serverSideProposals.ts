import { cache } from 'react';
import { parseProposalContent } from 'src/features/governance/fetchFromRepository';
import { getProposals } from 'src/features/governance/getProposals';
import {
  MergedProposalData,
  mergeProposalWithChainData,
} from 'src/features/governance/governanceData';
import { logger } from 'src/utils/logger';

const CGP_RAW_URL_BASE = 'https://raw.githubusercontent.com/celo-org/governance/main/CGPs/cgp-';
const CONTENT_REVALIDATE_SECONDS = 300;

/**
 * Server-side variant of useGovernanceProposals' data. Upvotes and isPassing are
 * rendered with defaults; the client refetches live on-chain values after hydration.
 * Returns null on failure so pages can fall back to client-side fetching.
 * Wrapped in React cache() to dedupe between generateMetadata and the page render.
 */
export const getServerSideProposals = cache(
  async (chainId: number): Promise<MergedProposalData[] | null> => {
    try {
      const proposals = await getProposals(chainId);
      return proposals.map((proposal) =>
        mergeProposalWithChainData(proposal, { upvotes: 0n, isPassing: false }),
      );
    } catch (error) {
      logger.error('Failed to fetch proposals server-side', error);
      return null;
    }
  },
);

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
