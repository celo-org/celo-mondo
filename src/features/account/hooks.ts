import { accountsABI, lockedGoldABI } from '@celo/abis';
import type { FetchBalanceResult } from '@wagmi/core';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { CELO } from 'src/config/tokens';
import { formatUnits } from 'viem';
import { useBalance as _useBalance, useContractRead } from 'wagmi';

// Defaults to CELO if tokenAddress is not provided
export function useBalance(address?: Address, tokenAddress?: Address) {
  const { data, isError, isLoading, error } = _useBalance({
    address: address,
    token: tokenAddress,
  });

  useToastError(error, 'Error fetching account balance');

  return { balance: data, isError, isLoading };
}

export function useLockedBalance(address?: Address) {
  const { data, isError, isLoading, error } = useContractRead({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalLockedGold',
    args: [address || ZERO_ADDRESS],
    enabled: !!address,
  });

  const lockedBalance: FetchBalanceResult | undefined = data
    ? {
        decimals: CELO.decimals,
        formatted: formatUnits(data, CELO.decimals),
        symbol: CELO.symbol,
        value: BigInt(data),
      }
    : undefined;

  useToastError(error, 'Error fetching locked balance');

  return { lockedBalance, isError, isLoading };
}

// Note, this retrieves the address's info from the Accounts contract
// It has nothing to do with wallets or backend services
export function useAccountDetails(address?: Address) {
  const {
    data: isRegistered,
    isError,
    isLoading,
    error,
  } = useContractRead({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'isAccount',
    args: [address || ZERO_ADDRESS],
    enabled: !!address,
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
