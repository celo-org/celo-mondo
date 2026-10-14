import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, StaleTime } from 'src/config/consts';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { DelegateesData, fetchDelegateeStats } from 'src/features/delegation/fetchDelegateeStats';
import { Participation } from 'src/features/delegation/participation';
import { logger } from 'src/utils/logger';
import { usePublicClient } from 'wagmi';

// Re-exported for existing importers; the implementation lives in a hook-free
// module so it can also run on the server
export { fetchDelegateeStats };
export type { DelegateesData };

export function useDelegatees(initialData?: DelegateesData) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- publicClient is a stable singleton
    queryKey: ['useDelegatees'],
    // Server-rendered data; marked stale so the client refetches after hydration
    initialData,
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      if (!publicClient) return null;
      logger.debug('Fetching delegatees');
      const cachedMetadata = Object.values(getDelegateeMetadata());
      const participation = await fetchParticipationFromApi(publicClient.chain!.id);
      const addressToDelegatee = await fetchDelegateeStats(
        publicClient,
        cachedMetadata,
        participation,
      );
      const delegatees = Object.values(addressToDelegatee);
      return { addressToDelegatee, delegatees };
    },
    gcTime: GCTime.Default,
    staleTime: StaleTime.Default,
  });

  useToastError(error, `Error fetching delegate data, ${error?.message}`);

  return {
    isLoading,
    isError,
    delegatees: data?.delegatees,
    addressToDelegatee: data?.addressToDelegatee,
  };
}

// Participation lives in the DB, which the browser reaches only through the API.
// A failure leaves it undefined so the delegates still render, minus the score.
async function fetchParticipationFromApi(
  chainId: number,
): Promise<AddressTo<Participation> | undefined> {
  try {
    const response = await fetch(`/api/governance/participation?chainId=${chainId}`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return (await response.json()) as AddressTo<Participation>;
  } catch (error) {
    logger.warn('Error fetching delegate participation', error);
    return undefined;
  }
}
