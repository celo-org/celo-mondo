import { Color } from 'src/styles/Color';

export enum VoteType {
  None = 'none',
  Abstain = 'abstain',
  No = 'no',
  Yes = 'yes',
}

export const VoteTypes = [VoteType.Yes, VoteType.No, VoteType.Abstain] as const;

export type VoteAmounts = {
  [VoteType.Yes]: bigint;
  [VoteType.No]: bigint;
  [VoteType.Abstain]: bigint;
};

export const EmptyVoteAmounts: VoteAmounts = {
  [VoteType.Yes]: 0n,
  [VoteType.No]: 0n,
  [VoteType.Abstain]: 0n,
};

export const VoteToColor: Record<VoteType, string> = {
  [VoteType.None]: Color.Grey,
  [VoteType.Abstain]: Color.Sand,
  [VoteType.No]: Color.Red,
  [VoteType.Yes]: Color.Mint,
};

// Using ints to align with solidity enum
export enum ProposalStage {
  None = 0,
  Queued = 1,
  Approval = 2,
  Referendum = 3,
  Execution = 4,
  Expiration = 5,
  // NOTE: solidity enum ends here
  // Adding extra stages that may be used in the metadata
  Executed = 6,
  Withdrawn = 7,
  Rejected = 8,
}

export const ProposalStageToStyle: Record<ProposalStage, { color: string; label: string }> = {
  [ProposalStage.None]: { color: Color.Sky, label: 'Draft' },
  [ProposalStage.Queued]: { color: Color.Lavender, label: 'Upvoting' },
  [ProposalStage.Approval]: { color: Color.Lavender, label: 'Approval' },
  [ProposalStage.Referendum]: { color: Color.Jade, label: 'Voting' },
  [ProposalStage.Execution]: { color: Color.Jade, label: 'Passed' },
  [ProposalStage.Expiration]: { color: Color.Red, label: 'Expired' },
  [ProposalStage.Executed]: { color: Color.Jade, label: 'Executed' },
  [ProposalStage.Withdrawn]: { color: Color.Red, label: 'Withdrawn' },
  [ProposalStage.Rejected]: { color: Color.Red, label: 'Rejected' },
};

export const ACTIVE_PROPOSAL_STAGES = [
  ProposalStage.Queued,
  ProposalStage.Approval,
  ProposalStage.Referendum,
  ProposalStage.Execution,
];

export const FAILED_PROPOSAL_STAGES = [
  ProposalStage.Expiration,
  ProposalStage.Rejected,
  ProposalStage.Withdrawn,
];

export interface Proposal {
  id: number;
  stage: ProposalStage;
  timestamp: number;
  expiryTimestamp?: number;
  url: string;
  proposer: Address;
  deposit: bigint;
  numTransactions: bigint;
  networkWeight: bigint;
  isApproved: boolean;
  upvotes: bigint;
  votes: VoteAmounts;
}
