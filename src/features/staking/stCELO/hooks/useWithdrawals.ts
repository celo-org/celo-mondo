import { readContract } from '@wagmi/core';
import { useCallback, useEffect, useState } from 'react';
import AccountABI from 'src/config/stcelo/AccountABI';
import useDefaultGroups from 'src/features/staking/stCELO/hooks/useDefaultGroups';
import { logger } from 'src/utils/logger';
import { claim, withdraw } from 'src/utils/stCELOAPI';
import type { Address } from 'viem';
import { useConfig, usePublicClient, useReadContract, useReadContracts } from 'wagmi';

export interface StCELOWithdrawalEntry {
  amount: bigint;
  timestamp: string;
}

export interface PendingStCELOWithdrawal {
  amount: bigint;
  timestamp: string;
  entries?: StCELOWithdrawalEntry[];
}

const botActionInterval = 180 * 1000;

export const useWithdrawalBot = (address?: Address) => {
  const config = useConfig();
  const { activeGroups: groups } = useDefaultGroups();

  const finalizeWithdrawal = useCallback(async () => {
    if (!address) return;
    if (!groups.length) return;

    try {
      for (const group of groups) {
        const scheduledWithdrawals = await readContract(config, {
          ...AccountABI,
          functionName: 'scheduledWithdrawalsForGroupAndBeneficiary',
          args: [group, address],
        });

        if (scheduledWithdrawals > 0) {
          await withdraw(address);
          return;
        }
      }
    } catch (error) {
      logger.warn('useWithdrawalBot: finalizeWithdrawal failed', error);
    }
  }, [address, groups, config]);

  useEffect(() => {
    void finalizeWithdrawal();
    const intervalId = setInterval(finalizeWithdrawal, botActionInterval);
    return () => {
      clearInterval(intervalId);
    };
  }, [finalizeWithdrawal]);
};

export const useClaimingBot = (address?: Address) => {
  const publicClient = usePublicClient();
  const { refetch: loadPendingWithdrawals } = useReadContract({
    ...AccountABI,
    functionName: 'getPendingWithdrawals',
    args: [address!],
    query: { enabled: !!address },
  });

  const finalizeClaim = useCallback(async () => {
    if (!address) return;

    try {
      const [{ timestamp: currentBlockTimestamp }, { data: valuesAndTimestamps }] =
        await Promise.all([
          publicClient!.getBlock({ blockTag: 'latest' }),
          loadPendingWithdrawals(),
        ]);
      const [, withdrawalTimestamps] = valuesAndTimestamps!;
      const availableToClaim = !!withdrawalTimestamps.find(
        (withdrawalTimestamp) => withdrawalTimestamp < currentBlockTimestamp,
      );

      if (availableToClaim) await claim(address);
    } catch (error) {
      logger.warn('useClaimingBot: finalizeClaim failed', error);
    }
  }, [address, loadPendingWithdrawals, publicClient]);

  useEffect(() => {
    void finalizeClaim();
    const intervalId = setInterval(finalizeClaim, botActionInterval);
    return () => {
      clearInterval(intervalId);
    };
  }, [finalizeClaim]);
};

/**
 * Groups pending withdrawals that are within 5 minutes time span
 */
const groupingTimeSpan = 5n * 60n;
export const formatPendingWithdrawals = (
  values: bigint[],
  timestamps: bigint[],
): PendingStCELOWithdrawal[] => {
  // Create indices array and sort by timestamps
  const indices = timestamps.map((_, i) => i);
  indices.sort((a, b) => Number(timestamps[a] - timestamps[b]));

  const pendingWithdrawals: PendingStCELOWithdrawal[] = [];
  const groupEntries: StCELOWithdrawalEntry[][] = [];

  let referenceTimestamp = 0n;
  for (let i = 0; i < indices.length; i++) {
    const timestamp = timestamps[indices[i]];
    const amount = values[indices[i]];
    const entry: StCELOWithdrawalEntry = { amount, timestamp: timestamp.toString() };

    /* If next timestamp is not within allowed time span create new pending withdrawal */
    if (pendingWithdrawals.length === 0 || timestamp > referenceTimestamp + groupingTimeSpan) {
      referenceTimestamp = timestamp;
      pendingWithdrawals.push({
        amount,
        timestamp: timestamp.toString(),
      });
      groupEntries.push([entry]);
      continue;
    }

    /* If next timestamp is within allowed time span merge it with the last pending withdrawal */
    const lastPendingWithdrawal = pendingWithdrawals[pendingWithdrawals.length - 1];
    lastPendingWithdrawal.timestamp = timestamp.toString();
    lastPendingWithdrawal.amount = lastPendingWithdrawal.amount + amount;
    groupEntries[groupEntries.length - 1].push(entry);
  }

  // Attach individual entries only to groups with 2+ items
  for (let i = 0; i < pendingWithdrawals.length; i++) {
    if (groupEntries[i].length > 1) {
      pendingWithdrawals[i].entries = groupEntries[i];
    }
  }

  return pendingWithdrawals.reverse();
};

// Shared across all hook instances so the StakeForm (modal) and account page stay in sync
let waitingPrevCount: number | null = null;
const listeners = new Set<() => void>();
function setWaiting(prevCount: number) {
  waitingPrevCount = prevCount;
  listeners.forEach((fn) => fn());
}
function clearWaiting() {
  waitingPrevCount = null;
  listeners.forEach((fn) => fn());
}

export const useWithdrawals = (address?: Address) => {
  const [, rerender] = useState(0);
  const isWaitingForNewWithdrawal = waitingPrevCount !== null;
  const { activeGroups } = useDefaultGroups();

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const { data: pendingWithdrawal, refetch: loadPendingWithdrawals } = useReadContract({
    ...AccountABI,
    functionName: 'getPendingWithdrawals',
    args: [address!],
    query: {
      enabled: !!address,
      select: ([values, timestamps]) =>
        formatPendingWithdrawals(values as bigint[], timestamps as bigint[]),
      refetchInterval: isWaitingForNewWithdrawal ? 3000 : 60 * 1000,
    },
  });

  // Fetch scheduled (pre-bot) withdrawals across all active groups via multicall
  const { data: scheduledResults } = useReadContracts({
    contracts: activeGroups.map(
      (group) =>
        ({
          ...AccountABI,
          functionName: 'scheduledWithdrawalsForGroupAndBeneficiary',
          args: [group, address!],
        }) as const,
    ),
    allowFailure: true,
    query: {
      enabled: !!address && activeGroups.length > 0,
      refetchInterval: 5000,
    },
  });

  const scheduledWithdrawalAmount = (scheduledResults ?? []).reduce(
    (sum, r) => sum + ((r.status === 'success' ? (r.result as bigint) : 0n) as bigint),
    0n,
  );

  const pendingWithdrawals = pendingWithdrawal || [];

  // Count raw on-chain entries (not grouped count) so we detect new withdrawals
  // even when they merge into an existing group
  const rawEntryCount = pendingWithdrawals.reduce((sum, w) => sum + (w.entries?.length || 1), 0);

  useEffect(() => {
    if (waitingPrevCount !== null && rawEntryCount > waitingPrevCount) {
      clearWaiting();
    }
  }, [rawEntryCount]);

  const startWaitingForNewWithdrawal = useCallback(() => {
    setWaiting(rawEntryCount);
  }, [rawEntryCount]);

  return {
    pendingWithdrawals,
    loadPendingWithdrawals,
    isWaitingForNewWithdrawal,
    startWaitingForNewWithdrawal,
    scheduledWithdrawalAmount,
  };
};
