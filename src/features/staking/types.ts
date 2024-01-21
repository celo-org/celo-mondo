export type GroupToStake = Record<Address, { active: bigint; pending: bigint }>;
export type StakingBalances = { active: bigint; pending: bigint; total: bigint };

export enum StakeActionType {
  Stake = 'stake',
  Unstake = 'unstake',
  Transfer = 'transfer',
}

export const StakeActionValues = Object.values(StakeActionType);

export enum StakeEventType {
  Activate = 'activate',
  Revoke = 'revoke', // Revoke of active votes (i.e. not pending)
}

export interface StakeEvent {
  type: StakeEventType;
  group: Address;
  value: bigint; // in wei
  units: bigint;
  blockNumber: number;
  timestamp: number;
  txHash: HexString;
}

export interface StakeFormValues {
  action: StakeActionType;
  amount: number;
  group: Address;
}
