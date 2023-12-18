import { lockedGoldABI } from '@celo/abis';
import type { FetchBalanceResult } from '@wagmi/core';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { CELO } from 'src/config/tokens';
import { formatUnits } from 'viem';
import { useAccount, useBalance, useContractRead } from 'wagmi';

export function useAccountBalance(tokenAddress?: Address) {
  const account = useAccount();
  const { data, isError, isLoading, error } = useBalance({
    address: account?.address,
    token: tokenAddress,
  });

  useToastError(error, 'Error fetching account balance');

  return { address: account?.address, balance: data, isError, isLoading };
}

export function useLockedBalance() {
  const account = useAccount();
  const { data, isError, isLoading, error } = useContractRead({
    address: Addresses.LockedGold,
    abi: lockedGoldABI,
    functionName: 'getAccountTotalLockedGold',
    args: [account?.address || ZERO_ADDRESS],
    enabled: !!account?.address,
  });

  const balance: FetchBalanceResult | undefined = data
    ? {
        decimals: CELO.decimals,
        formatted: formatUnits(data, CELO.decimals),
        symbol: CELO.symbol,
        value: data,
      }
    : undefined;

  useToastError(error, 'Error fetching locked balance');

  return { address: account?.address, balance, isError, isLoading };
}
