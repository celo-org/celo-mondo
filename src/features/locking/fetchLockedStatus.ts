import { lockedGoldABI } from '@celo/abis';
import { Addresses } from 'src/config/contracts';
import { LockedStatus, PendingWithdrawal } from 'src/features/locking/types';
import { PublicClient } from 'wagmi';

type PendingWithdrawalsRaw = readonly [readonly bigint[], readonly bigint[]]; // values and times

export async function fetchLockedStatus(
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
  const pendingWithdrawalsRaw: PendingWithdrawalsRaw = pendingWithdrawalsResp.result;

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
