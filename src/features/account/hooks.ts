import { accountsABI, lockedGoldABI } from '@celo/abis';
import { useEffect, useState } from 'react';
import { useToastError } from 'src/components/notifications/useToastError';
import { BALANCE_REFRESH_INTERVAL, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { isCel2 } from 'src/utils/is-cel2';
import { isNullish } from 'src/utils/typeof';
import { useBalance as _useBalance, usePublicClient, useReadContract } from 'wagmi';

export function useBalance(address?: Address) {
  const { data, isError, isLoading, error, refetch } = _useBalance({
    address: address,
    query: {
      enabled: !!address,
      refetchInterval: BALANCE_REFRESH_INTERVAL,
      staleTime: BALANCE_REFRESH_INTERVAL,
    },
  });

  useToastError(error, 'Error fetching account balance');

  return { balance: data?.value, isError, isLoading, refetch };
}

export function useLockedBalance(address?: Address) {
  const { data, isError, isLoading, error, refetch } = useReadContract({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalLockedGold',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
      refetchInterval: BALANCE_REFRESH_INTERVAL,
      staleTime: BALANCE_REFRESH_INTERVAL,
    },
  });

  useToastError(error, 'Error fetching locked balance');

  return {
    lockedBalance: !isNullish(data) ? BigInt(data) : undefined,
    isError,
    isLoading,
    refetch,
  };
}

// Note, this retrieves the address' info from the Accounts contract
// It has nothing to do with wallets or backend services
export function useAccountDetails(address?: Address) {
  const {
    data: isRegistered,
    isError,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'isAccount',
    args: [address || ZERO_ADDRESS],
    query: { enabled: !!address },
  });

  // Note, more reads can be added here if more info is needed, such
  // as name, metadataUrl, walletAddress, voteSignerToAccount, etc.

  useToastError(error, 'Error fetching account registration status');

  return {
    isRegistered,
    isError,
    isLoading,
    refetch,
  };
}

export function useIsCel2() {
  const publicClient = usePublicClient();
  const [_isCel2, setIsCel2] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (!publicClient) return;

    void isCel2(publicClient).then((value) => setIsCel2(value));
  }, [publicClient]);

  return _isCel2;
}
