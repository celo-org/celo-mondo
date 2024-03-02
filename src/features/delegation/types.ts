import { ValidatorGroup } from 'src/features/validators/types';

// See https://github.com/celo-org/celo-monorepo/blob/release/core-contracts/10/packages/protocol/contracts/governance/LockedGold.sol#L667
export interface DelegationAmount {
  percent: number;
  amount: bigint;
}

export interface DelegationBalances {
  totalPercent: number;
  totalAmount: bigint;
  delegateeToAmount: AddressTo<DelegationAmount>;
}

export enum DelegateActionType {
  Delegate = 'delegate',
  Undelegate = 'undelegate',
  Transfer = 'transfer',
}

export const DelegateActionValues = Object.values(DelegateActionType);

export interface DelegateFormValues {
  action: DelegateActionType;
  percent: number;
  delegatee: Address;
  // Only used in transfer actions, the new target group
  transferDelegatee: Address;
}

// TODO
export type Delegatee = ValidatorGroup;
