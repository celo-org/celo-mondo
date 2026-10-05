import { cache } from 'react';
import {
  fetchValidatorGroupInfo,
  ValidatorGroupInfo,
} from 'src/features/validators/fetchValidatorGroupInfo';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { PublicClient } from 'viem';

/**
 * Server-side variant of useValidatorGroups' data, used to render validator
 * pages with content for crawlers. Returns null on failure so pages can fall
 * back to client-side fetching. Wrapped in React cache() to dedupe within a request.
 */
export const getServerSideValidatorGroups = cache(async (): Promise<ValidatorGroupInfo | null> => {
  try {
    return await fetchValidatorGroupInfo(celoPublicClient as PublicClient);
  } catch (error) {
    logger.error('Failed to fetch validator groups server-side', error);
    return null;
  }
});
