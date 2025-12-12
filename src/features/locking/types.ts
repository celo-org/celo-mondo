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
  unlockingPeriod: bigint;
}

export enum LockActionType {
  Lock = 'lock',
  Unlock = 'unlock',
  Withdraw = 'withdraw',
}
export enum LiquidStakeActionType {
  Stake = 'stake',
  Unstake = 'unstake',
}

export const LockActionValues = Object.values(LockActionType);
export const StCeloActionValues = Object.values(LiquidStakeActionType);

export interface LockFormValues {
  amount: number;
  action: LockActionType;
}
export interface LiquidStakeFormValues {
  amount: number;
  action: LiquidStakeActionType;
}
