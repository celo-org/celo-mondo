export type GroupToStake = Record<
  Address,
  {
    active: bigint;
    pending: bigint;
    // The group's index in the on-chain voting list. Required for unstaking
    groupIndex: bigint;
  }
>;
export type StakingBalances = { active: bigint; pending: bigint; total: bigint };

export enum StakeActionType {
  Stake = 'stake',
  Unstake = 'unstake',
  Transfer = 'transfer',
}
export enum StCeloActionType {
  ChangeStrategy = 'change Strategy',
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
  // Only used in transfer actions, the new target group
  transferGroup: Address;
  delegate: boolean;
}

export interface ChangeStrategyFormValues {
  action: StCeloActionType.ChangeStrategy;
  amount: bigint;
  group: Address;
  transferGroup: Address;
}
