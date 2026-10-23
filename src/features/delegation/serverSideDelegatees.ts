import { cache } from 'react';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { DelegateesData, fetchDelegateeStats } from 'src/features/delegation/fetchDelegateeStats';
import { fetchParticipation } from 'src/features/delegation/fetchParticipation';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { PublicClient } from 'viem';

/**
 * Server-side variant of useDelegatees' data, used to render delegate pages
 * with content for crawlers. Returns null on failure so pages can fall back
 * to client-side fetching. Wrapped in React cache() to dedupe within a request.
 */
export const getServerSideDelegatees = cache(async (): Promise<DelegateesData | null> => {
  try {
    const metadata = Object.values(getDelegateeMetadata());
    const participation = await fetchParticipation(celoPublicClient.chain.id).catch((error) => {
      logger.warn('Failed to fetch delegate participation server-side', error);
      return undefined;
    });
    const addressToDelegatee = await fetchDelegateeStats(
      celoPublicClient as PublicClient,
      metadata,
      participation,
    );
    return { addressToDelegatee, delegatees: Object.values(addressToDelegatee) };
  } catch (error) {
    logger.error('Failed to fetch delegatees server-side', error);
    return null;
  }
});
