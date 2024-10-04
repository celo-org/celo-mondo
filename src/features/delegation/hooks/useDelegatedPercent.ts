import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { logger } from 'src/utils/logger';
import { fromFixidity } from 'src/utils/numbers';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useDelegatedPercent(address?: Address) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useDelegatedPercent', publicClient, address],
    queryFn: async () => {
      if (!address || !publicClient) return null;

      logger.debug('Fetching delegated percent');

      return fetchDelegatedFraction(publicClient, address);
    },
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  useToastError(error, 'Error fetching delegated percent');

  return {
    isLoading,
    isError,
    delegatedPercent: data || 0,
    refetch,
  };
}

async function fetchDelegatedFraction(
  publicClient: PublicClient,
  address: Address,
): Promise<number> {
  const delegatedFraction = await publicClient.readContract({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalDelegatedFraction',
    args: [address],
  });

  return fromFixidity(delegatedFraction) * 100;
}
