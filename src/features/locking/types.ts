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

export const LockActionValues = Object.values(LockActionType);

export interface LockFormValues {
  amount: number;
  action: LockActionType;
}
