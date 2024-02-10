import { lockedGoldABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from 'src/components/notifications/useToastError';
import { Addresses } from 'src/config/contracts';
import { LockedStatus, PendingWithdrawal } from 'src/features/locking/types';
import { logger } from 'src/utils/logger';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';

export function useLockedStatus(address?: Address) {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data, refetch } = useQuery({
    queryKey: ['useLockedStatus', publicClient, address],
    queryFn: async () => {
      if (!address || !publicClient) return null;
      logger.debug('Fetching locked status balance and withdrawals');
      return fetchLockedStatus(publicClient, address);
    },
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  useToastError(error, 'Error fetching locked balances and withdrawals');

  return {
    isLoading,
    isError,
    lockedBalances: data?.balances,
    pendingWithdrawals: data?.pendingWithdrawals,
    refetch,
  };
}

async function fetchLockedStatus(
  publicClient: PublicClient,
  address: Address,
): Promise<LockedStatus> {
  const [totalLockedResp, pendingWithdrawalsResp] = await publicClient.multicall({
    contracts: [
      {
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        functionName: 'getAccountTotalLockedGold',
        args: [address],
      },
      {
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        functionName: 'getPendingWithdrawals',
        args: [address],
      },
    ],
  });
  if (totalLockedResp.status !== 'success' || pendingWithdrawalsResp.status !== 'success') {
    throw new Error('Error fetching locked balances or pending withdrawals');
  }
  const totalLocked = totalLockedResp.result;
  // [values, times]
  const pendingWithdrawalsRaw = pendingWithdrawalsResp.result;

  let pendingBlocked = 0n;
  let pendingFree = 0n;
  const pendingWithdrawals: PendingWithdrawal[] = [];

  if (pendingWithdrawalsRaw?.length === 2) {
    const values = pendingWithdrawalsRaw[0];
    const timestamps = pendingWithdrawalsRaw[1];
    if (!values || !timestamps || values.length !== timestamps.length) {
      throw new Error('Invalid pending withdrawals data');
    }
    const now = Date.now();
    for (let i = 0; i < values.length; i++) {
      const value = BigInt(values[i]);
      const timestamp = Number(timestamps[i]) * 1000;
      if (timestamp <= now) {
        pendingFree += value;
      } else {
        pendingBlocked += value;
      }
      pendingWithdrawals.push({
        index: i,
        value,
        timestamp,
      });
    }
  }

  return {
    balances: {
      locked: totalLocked,
      pendingBlocked,
      pendingFree,
    },
    pendingWithdrawals,
  };
}
