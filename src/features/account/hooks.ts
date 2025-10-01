import { accountsABI, lockedGoldABI, validatorsABI } from '@celo/abis';
import { useToastError } from 'src/components/notifications/useToastError';
import { BALANCE_REFRESH_INTERVAL, StaleTime, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { eqAddress } from 'src/utils/addresses';
import { isNullish } from 'src/utils/typeof';
import { ReadContractErrorType } from 'viem';
import { useBalance as _useBalance, useReadContract } from 'wagmi';

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

export function useGetVoteSignerFor(address?: Address) {
  return useReadContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'getVoteSigner',
    args: [address || ZERO_ADDRESS],
    query: {
      enabled: !!address,
    },
  });
}

// will return address it is authorized to vote on behalf of or itself if it is a registered account
export function useVoteSignerToAccount(address: Address | undefined) {
  const isRegistered = useIsAccount(address);
  const {
    data: account,
    isError,
    isLoading,
    isFetched,
    refetch,
  } = useReadContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'voteSignerToAccount',
    args: [address || ZERO_ADDRESS],
    scopeKey: `voteSignerToAccount-${address}`,
    query: {
      staleTime: StaleTime.Default,
      enabled: isRegistered.isFetched,
      // The contract will revert if given address is neither
      // - authorized to vote for any accounts (but is authorized for some other role)
      // - or not registered
      // and hence we don't need to retry in this case, otherwise
      // we'll retry up to 3 times
      retry: (failureCount: number, error: ReadContractErrorType) => {
        if (error.message.includes('reverted')) {
          return false;
        }

        return failureCount < 3;
      },
    },
  });
  return {
    signingFor: isRegistered.data ? address : account || address,
    isVoteSigner: account && address && !eqAddress(account, address),
    isError,
    isLoading,
    isFetched: isFetched,
    refetch,
  };
}

// Note, this retrieves the address' info from the Accounts contract
// It has nothing to do with wallets or backend services
export function useAccountDetails(address?: Address) {
  const isAccountResult = useIsAccount(address);

  const isValidatorResult = useReadContract({
    address: Addresses.Validators,
    abi: validatorsABI,
    functionName: 'isValidator',
    args: [address || ZERO_ADDRESS],
    query: { enabled: !!address },
  });

  const isValidatorGroupResult = useReadContract({
    address: Addresses.Validators,
    abi: validatorsABI,
    functionName: 'isValidatorGroup',
    args: [address || ZERO_ADDRESS],
    query: { enabled: !!address },
  });

  // Note, more reads can be added here if more info is needed, such
  // as name, metadataUrl, walletAddress, voteSignerToAccount, etc.

  useToastError(
    isAccountResult.error || isValidatorResult.error || isValidatorGroupResult.error,
    'Error fetching account details',
  );

  return {
    isRegistered: isAccountResult.data,
    isValidator: isValidatorResult.data,
    isValidatorGroup: isValidatorGroupResult.data,
    isError: isAccountResult.isError || isValidatorResult.isError || isValidatorGroupResult.isError,
    isLoading:
      isAccountResult.isLoading || isValidatorResult.isLoading || isValidatorGroupResult.isLoading,
    refetch: () =>
      Promise.all([
        isAccountResult.refetch(),
        isValidatorResult.refetch(),
        isValidatorGroupResult.refetch(),
      ]),
  };
}

export function useIsAccount(address: Address | undefined) {
  return useReadContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'isAccount',
    args: [address || ZERO_ADDRESS],
    query: { enabled: !!address },
  });
}
