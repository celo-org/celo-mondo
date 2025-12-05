import { DelegationForm } from 'src/features/delegation/DelegationForm';
import { UpvoteForm } from 'src/features/governance/UpvoteForm';
import { VoteForm } from 'src/features/governance/VoteForm';
import { LockForm } from 'src/features/locking/LockForm';
import { StakeForm } from 'src/features/staking/StakeForm';
import { ChangeStrategyForm } from 'src/features/staking/stCELO/ChangeStrategyForm';
import { StakeStCeloForm } from 'src/features/staking/stCELO/StakeForm';
import { TransactionFlowProps } from 'src/features/transactions/TransactionFlow';

// The set of unique tx flows in the app
export enum TransactionFlowType {
  Lock = 'lock',
  Stake = 'stake',
  ChangeStrategy = 'liquid stake',
  StakeStCELO = 'lock stCELO',
  UnstakeStCELO = 'unlock stCELO',
  Upvote = 'upvote',
  Vote = 'vote',
  Delegate = 'delegate',
}

export const transactionFlowProps: Record<TransactionFlowType, TransactionFlowProps> = {
  [TransactionFlowType.Lock]: {
    FormComponent: LockForm,
    header: 'Lock CELO',
    requiresLockedFundsOrVoteSigner: false,
  },
  [TransactionFlowType.Stake]: {
    FormComponent: StakeForm,
    header: 'Stake CELO',
    requiresLockedFundsOrVoteSigner: true,
  },
  [TransactionFlowType.StakeStCELO]: {
    FormComponent: StakeStCeloForm,
    header: 'Stake stCELO',
    requiresLockedFundsOrVoteSigner: false,
  },
  [TransactionFlowType.UnstakeStCELO]: {
    FormComponent: StakeStCeloForm,
    header: 'Unstake stCELO',
    requiresStCelo: true,
    requiresLockedFundsOrVoteSigner: false,
  },
  [TransactionFlowType.ChangeStrategy]: {
    FormComponent: ChangeStrategyForm,
    header: 'Change voting strategy',
    requiresStCelo: true,
    requiresLockedFundsOrVoteSigner: false,
  },
  [TransactionFlowType.Upvote]: {
    FormComponent: UpvoteForm,
    header: 'Upvote proposal',
    requiresLockedFundsOrVoteSigner: true,
  },
  [TransactionFlowType.Vote]: {
    FormComponent: VoteForm,
    header: 'Vote for proposal',
    requiresLockedFundsOrVoteSigner: true,
  },
  [TransactionFlowType.Delegate]: {
    FormComponent: DelegationForm,
    header: 'Delegate CELO',
    requiresLockedFundsOrVoteSigner: true,
  },
};
