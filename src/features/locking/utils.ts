import { LockedBalances } from 'src/features/locking/types';

export function getTotalCelo(lockedBalance: LockedBalances, walletBalance: bigint) {
  const { locked, pendingBlocked, pendingFree } = lockedBalance;
  return walletBalance + locked + pendingBlocked + pendingFree;
}

export function getTotalUnlockedCelo(lockedBalance: LockedBalances, walletBalance: bigint) {
  const { pendingBlocked, pendingFree } = lockedBalance;
  return walletBalance + pendingBlocked + pendingFree;
}

export function getTotalLockedCelo(balances: LockedBalances) {
  const { locked, pendingBlocked, pendingFree } = balances;
  return locked + pendingBlocked + pendingFree;
}

export function getTotalPendingCelo(balances: LockedBalances) {
  const { pendingBlocked, pendingFree } = balances;
  return pendingBlocked + pendingFree;
}

export function hasPendingCelo(balances: LockedBalances) {
  const { pendingBlocked, pendingFree } = balances;
  return pendingBlocked > 0 || pendingFree > 0;
}
