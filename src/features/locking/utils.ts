import type { LockedBalances } from 'src/features/locking/types';
import type { StakingBalances } from 'src/features/staking/types';
import { isNullish } from 'src/utils/typeof';

export function getTotalCelo(lockedBalance?: LockedBalances, walletBalance?: bigint) {
  if (isNullish(lockedBalance) || isNullish(walletBalance)) return 0n;
  const { locked, pendingBlocked, pendingFree } = lockedBalance;
  return walletBalance + locked + pendingBlocked + pendingFree;
}

export function getTotalUnlockedCelo(lockedBalance?: LockedBalances, walletBalance?: bigint) {
  if (isNullish(lockedBalance) || isNullish(walletBalance)) return 0n;
  const { pendingBlocked, pendingFree } = lockedBalance;
  return walletBalance + pendingBlocked + pendingFree;
}

export function getTotalLockedCelo(lockedBalance?: LockedBalances) {
  if (isNullish(lockedBalance)) return 0n;
  const { locked, pendingBlocked, pendingFree } = lockedBalance;
  return locked + pendingBlocked + pendingFree;
}

export function getTotalPendingCelo(lockedBalance?: LockedBalances) {
  if (isNullish(lockedBalance)) return 0n;
  const { pendingBlocked, pendingFree } = lockedBalance;
  return pendingBlocked + pendingFree;
}

export function hasPendingCelo(lockedBalance?: LockedBalances) {
  if (isNullish(lockedBalance)) return 0n;
  const { pendingBlocked, pendingFree } = lockedBalance;
  return pendingBlocked > 0n || pendingFree > 0n;
}

export function getTotalNonvotingLocked(
  lockedBalances: LockedBalances,
  stakingBalaces: StakingBalances,
) {
  return lockedBalances.locked - stakingBalaces.total;
}
