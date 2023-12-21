import { lockedGoldABI } from '@celo/abis';
import type { FetchBalanceResult } from '@wagmi/core';
import { useToastError } from 'src/components/notifications/useToastError';
import { ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { CELO } from 'src/config/tokens';
import { formatUnits } from 'viem';
import { useBalance as _useBalance, useContractRead } from 'wagmi';

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

  const balance: FetchBalanceResult | undefined = data
    ? {
        decimals: CELO.decimals,
        formatted: formatUnits(data, CELO.decimals),
        symbol: CELO.symbol,
        value: data,
      }
    : undefined;

  useToastError(error, 'Error fetching locked balance');

  return { balance, isError, isLoading };
}
