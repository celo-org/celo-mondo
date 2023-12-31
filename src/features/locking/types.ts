export interface PendingWithdrawal {
  index: number;
  value: bigint; // in wei
  timestamp: number; // Time when the funds are available
}

// All values in wei
export interface LockedBalances {
  locked: bigint;
  pendingBlocked: bigint;
  pendingFree: bigint;
}

export interface LockedStatus {
  balances: LockedBalances;
  pendingWithdrawals: PendingWithdrawal[];
}

export enum LockActionType {
  Lock = 'lock',
  Unlock = 'unlock',
  Withdraw = 'withdraw',
}

export function lockActionLabel(type: LockActionType, activeTense = false) {
  if (type === LockActionType.Lock) {
    return activeTense ? 'Locking' : 'Lock';
  } else if (type === LockActionType.Unlock) {
    return activeTense ? 'Unlocking' : 'Unlock';
  } else if (type === LockActionType.Withdraw) {
    return activeTense ? 'Withdrawing' : 'Withdraw';
  } else {
    throw new Error(`Invalid lock action type: ${type}`);
  }
}

export interface LockTokenParams {
  weiAmount: bigint;
  action: LockActionType;
}
