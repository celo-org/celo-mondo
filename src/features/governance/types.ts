export enum VoteValue {
  None = 'none',
  Abstain = 'abstain',
  No = 'no',
  Yes = 'yes',
}

export const OrderedVoteValue = [VoteValue.None, VoteValue.Abstain, VoteValue.No, VoteValue.Yes];

// Using ints to align with solidity enum
export enum ProposalStage {
  None = 0,
  Queued = 1,
  Approval = 2,
  Referendum = 3,
  Execution = 4,
  Expiration = 5,
}

export interface GovernanceProposal {
  id: string;
  timestamp: number;
  url: string;
  stage: ProposalStage;
  votes: {
    [VoteValue.Yes]: string;
    [VoteValue.No]: string;
    [VoteValue.Abstain]: string;
  };
}

export interface GovernanceProposalWithMetadata extends GovernanceProposal {
  description: string;
  //TODO
}
