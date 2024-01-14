import { accountsABI, lockedGoldABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { useBalance as _useBalance, useReadContract } from 'wagmi';

// Defaults to CELO if tokenAddress is not provided
export function useBalance(address?: Address) {
  const { data, isError, isLoading, error } = _useBalance({
    address: address,
  });

  useToastError(error, 'Error fetching account balance');

  return { balance: data?.value, isError, isLoading };
}

export function useLockedBalance(address?: Address) {
  const { data, isError, isLoading, error } = useReadContract({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalLockedGold',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
    },
  });

  useToastError(error, 'Error fetching locked balance');

  return { lockedBalance: data ? BigInt(data) : undefined, isError, isLoading };
}

// Note, this retrieves the address's info from the Accounts contract
// It has nothing to do with wallets or backend services
export function useAccountDetails(address?: Address) {
  const {
    data: isRegistered,
    isError,
    isLoading,
    error,
  } = useReadContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'isAccount',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
    },
  });

  // Note, more reads can be added here if more info is needed, such
  // as name, metadataUrl, walletAddress, voteSignerToAccount, etc.

  useToastError(error, 'Error fetching account registration status');

  return {
    account: { isRegistered },
    isError,
    isLoading,
  };
}
