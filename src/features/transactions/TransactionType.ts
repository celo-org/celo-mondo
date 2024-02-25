import { LockForm } from 'src/features/locking/LockForm';
import { StakeForm } from 'src/features/staking/StakeForm';
import { TransactionFlowProps } from 'src/features/transactions/TransactionFlow';

// The set of unique tx flows in the app
export enum TransactionFlowType {
  Lock = 'lock',
  Stake = 'stake',
  Upvote = 'upvote',
  Vote = 'vote',
  Delegate = 'delegate',
}

export const transactionFlowProps: Record<TransactionFlowType, TransactionFlowProps> = {
  [TransactionFlowType.Lock]: {
    FormComponent: LockForm,
    header: 'Lock CELO',
    requiresLockedFunds: false,
  },
  [TransactionFlowType.Stake]: {
    FormComponent: StakeForm,
    header: 'Stake CELO',
    requiresLockedFunds: true,
  },
  [TransactionFlowType.Upvote]: {
    FormComponent: StakeForm,
    header: 'Vote for proposal',
    requiresLockedFunds: true,
  },
  [TransactionFlowType.Vote]: {
    FormComponent: StakeForm,
    header: 'Vote for proposal',
    requiresLockedFunds: true,
  },
  [TransactionFlowType.Delegate]: {
    FormComponent: StakeForm,
    header: 'Delegate CELO',
    requiresLockedFunds: true,
  },
};
