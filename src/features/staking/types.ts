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

export type GroupVotes = Record<string, { active: string; pending: string }>; // address to votes

export enum StakeEventType {
  Activate = 'activate',
  Revoke = 'revoke', // Revoke of active votes (i.e. not pending)
}

export interface StakeEvent {
  type: StakeEventType;
  group: Address;
  value: string;
  units: string;
  blockNumber: number;
  timestamp: number;
  txHash: string;
}
