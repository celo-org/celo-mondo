import { readContract } from '@wagmi/core';
import { useCallback, useEffect } from 'react';
import AccountABI from 'src/config/stcelo/AccountABI';
import { useAPI } from 'src/features/staking/stCELO/hooks/useAPI';
import useDefaultGroups from 'src/features/staking/stCELO/hooks/useDefaultGroups';
import type { Address } from 'viem';
import { useConfig, usePublicClient, useReadContract } from 'wagmi';

export interface PendingWithdrawal {
  amount: bigint;
  timestamp: string;
}

const botActionInterval = 180 * 1000;

export const useWithdrawalBot = (address?: Address) => {
  const api = useAPI();
  const config = useConfig();
  const { activeGroups: groups } = useDefaultGroups();

  const finalizeWithdrawal = useCallback(async () => {
    if (!address) return;
    if (!groups.length) return;

    for (const group of groups) {
      const scheduledWithdrawals = await readContract(config, {
        ...AccountABI,
        functionName: 'scheduledWithdrawalsForGroupAndBeneficiary',
        args: [group, address],
      });

      if (scheduledWithdrawals > 0) return api.withdraw(address);
    }
  }, [address, groups, api, config]);

  useEffect(() => {
    void finalizeWithdrawal();
    const intervalId = setInterval(finalizeWithdrawal, botActionInterval);
    return () => {
      clearInterval(intervalId);
    };
  }, [finalizeWithdrawal]);
};

export const useClaimingBot = (address?: Address) => {
  const api = useAPI();
  const publicClient = usePublicClient();
  const { refetch: loadPendingWithdrawals } = useReadContract({
    ...AccountABI,
    functionName: 'getPendingWithdrawals',
    args: [address!],
    query: { enabled: !!address },
  });

  const claim = useCallback(async () => {
    if (!address) return;

    const [{ timestamp: currentBlockTimestamp }, { data: valuesAndTimestamps }] = await Promise.all(
      [publicClient!.getBlock({ blockTag: 'latest' }), loadPendingWithdrawals()],
    );
    const [, withdrawalTimestamps] = valuesAndTimestamps!;
    const availableToClaim = !!withdrawalTimestamps.find(
      (withdrawalTimestamp) => withdrawalTimestamp < currentBlockTimestamp,
    );

    if (availableToClaim) await api.claim(address);
  }, [address, loadPendingWithdrawals, publicClient, api]);

  useEffect(() => {
    void claim();
    const intervalId = setInterval(claim, botActionInterval);
    return () => {
      clearInterval(intervalId);
    };
  }, [claim]);
};

/**
 * Groups pending withdrawals that are within 5 minutes time span
 */
const groupingTimeSpan = 5n * 60n;
const formatPendingWithdrawals = (values: bigint[], timestamps: bigint[]): PendingWithdrawal[] => {
  const sortedTimestamps = [...timestamps].sort();
  const pendingWithdrawals: PendingWithdrawal[] = [];

  let referenceTimestamp = 0n;
  for (let index = 0; index < sortedTimestamps.length; index++) {
    const timestamp = sortedTimestamps[index];
    const amount = values[index];

    /* If next timestamp is not within allowed time span create new pending withdrawal */
    if (timestamp > referenceTimestamp + groupingTimeSpan) {
      referenceTimestamp = timestamp;
      pendingWithdrawals.push({
        amount,
        timestamp: timestamp.toString(),
      });
      continue;
    }

    /* If next timestamp is within allowed time span merge it with the last pending withdrawal */
    const lastPendingWithdrawal = pendingWithdrawals[pendingWithdrawals.length - 1];
    lastPendingWithdrawal.timestamp = timestamp.toString();
    lastPendingWithdrawal.amount = lastPendingWithdrawal.amount + amount;
  }

  return pendingWithdrawals.reverse();
};

export const useWithdrawals = (address?: Address) => {
  const { data: pendingWithdrawal, refetch: loadPendingWithdrawals } = useReadContract({
    ...AccountABI,
    functionName: 'getPendingWithdrawals',
    args: [address!],
    query: {
      enabled: !!address,
      select: ([values, timestamps]) =>
        formatPendingWithdrawals(values as bigint[], timestamps as bigint[]),
      refetchInterval: 60 * 1000,
    },
  });

  return {
    pendingWithdrawals: pendingWithdrawal || [],
    loadPendingWithdrawals,
  };
};
