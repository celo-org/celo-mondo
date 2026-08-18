import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime, ZERO_ADDRESS } from 'src/config/consts';
import { DEFAULT_STRATEGY } from 'src/features/staking/stCELO/descriptors';
import useDefaultGroups, {
  useStCeloInDefaultGroups,
} from 'src/features/staking/stCELO/hooks/useDefaultGroups';
import {
  fetchValidatorGroupInfo,
  ValidatorGroupInfo,
} from 'src/features/validators/fetchValidatorGroupInfo';
import { logger } from 'src/utils/logger';
import { usePublicClient } from 'wagmi';
import { Validator, ValidatorGroup } from './types';

// Re-exported for existing importers; the implementation lives in a hook-free
// module so it can also run on the server
export { fetchValidatorGroupInfo };
export type { ValidatorGroupInfo };

export function useValidatorGroups(
  includeStCeloDefault: boolean = false,
  initialData?: ValidatorGroupInfo,
) {
  const publicClient = usePublicClient();
  const { isLoading, isError, error, data } = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- publicClient is a stable singleton; including it causes cache invalidation on navigation
    queryKey: ['useValidatorGroups'],
    // Server-rendered data; marked stale so the client refetches after hydration
    initialData,
    initialDataUpdatedAt: 0,
    queryFn: () => {
      if (!publicClient) return null;
      logger.debug('Fetching validator groups');
      return fetchValidatorGroupInfo(publicClient);
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching validator groups');

  const { activeGroups: stCeloDefaultGroups } = useDefaultGroups(includeStCeloDefault);
  const stCeloDefaultVotes = useStCeloInDefaultGroups(includeStCeloDefault);

  const addressToGroup = useMemo(() => {
    const _addressToGroup = data?.addressToGroup;

    if (includeStCeloDefault && stCeloDefaultGroups.length) {
      const safeAddressToGroup = _addressToGroup ? _addressToGroup : {};
      return {
        addressToGroup: {
          ...safeAddressToGroup,
          [ZERO_ADDRESS]: {
            ...DEFAULT_STRATEGY,
            votes: stCeloDefaultVotes.data ?? DEFAULT_STRATEGY.votes,
            members: stCeloDefaultGroups.reduce((result, current) => {
              return {
                ...result,
                [current]: {
                  address: current,
                  name: safeAddressToGroup[current]?.name,
                  score: safeAddressToGroup[current]?.score || 0,
                  signer: current,
                  status: 1,
                } satisfies Validator,
              };
            }, {}),
          } as ValidatorGroup,
        } satisfies AddressTo<ValidatorGroup>,
        isLoading: stCeloDefaultVotes.isLoading,
      };
    }
    return { addressToGroup: _addressToGroup, isLoading: false };
  }, [
    data?.addressToGroup,
    includeStCeloDefault,
    stCeloDefaultGroups,
    stCeloDefaultVotes.data,
    stCeloDefaultVotes.isLoading,
  ]);

  return {
    isLoading: isLoading || addressToGroup.isLoading,
    isError,
    groups: data?.groups,
    addressToGroup: addressToGroup.addressToGroup,
    totalLocked: data?.totalLocked,
    totalVotes: data?.totalVotes,
  };
}
