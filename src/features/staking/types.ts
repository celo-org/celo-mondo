export type GroupToStake = Record<Address, { active: bigint; pending: bigint }>;
export type StakingBalances = { active: bigint; pending: bigint; total: bigint };

export enum StakeActionType {
  Vote = 'vote',
  Activate = 'activate',
  Revoke = 'revoke',
}

export function stakeActionLabel(type: StakeActionType, activeTense = false) {
  if (type === StakeActionType.Vote) {
    return activeTense ? 'Voting' : 'Vote';
  } else if (type === StakeActionType.Activate) {
    return activeTense ? 'Activating' : 'Activate';
  } else if (type === StakeActionType.Revoke) {
    return activeTense ? 'Revoking' : 'Revoke';
  } else {
    throw new Error(`Invalid lock action type: ${type}`);
  }
}

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
