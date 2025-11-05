import { Color } from 'src/styles/Color';
import { z } from 'zod';

/**
 * TYPES CORRESPONDING TO GOVERNANCE + PROPOSAL CONTRACTS
 */

export enum VoteType {
  None = 'none',
  Abstain = 'abstain',
  No = 'no',
  Yes = 'yes',
}

export const VoteTypes: VoteType[] = [VoteType.Yes, VoteType.No, VoteType.Abstain] as const;
// Used to go from VoteValue enum to Governance Contract's enum
export const OrderedVoteValue = [VoteType.None, VoteType.Abstain, VoteType.No, VoteType.Yes];

export const VoteTypeToIcon = {
  [VoteType.None]: '⚪',
  [VoteType.Abstain]: '⚪',
  [VoteType.No]: '👎',
  [VoteType.Yes]: '👍',
};

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
  isPassing: boolean;
  upvotes: bigint;
  votes: VoteAmounts;
}

export interface UpvoteRecord {
  proposalId: number;
  upvotes: bigint;
}

/**
 * TYPES CORRESPONDING TO REPOSITORY METADATA
 */
export enum ProposalMetadataStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  EXECUTED = 'EXECUTED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export const MetadataStatusToStage: Record<ProposalMetadataStatus, ProposalStage> = {
  [ProposalMetadataStatus.DRAFT]: ProposalStage.None,
  // Note, some proposals are listed as PROPOSED but are actually completed/expired
  // There's some logic in the proposal merging to help account for this
  [ProposalMetadataStatus.PROPOSED]: ProposalStage.Queued,
  [ProposalMetadataStatus.EXECUTED]: ProposalStage.Executed,
  [ProposalMetadataStatus.EXPIRED]: ProposalStage.Expiration,
  [ProposalMetadataStatus.REJECTED]: ProposalStage.Rejected,
  [ProposalMetadataStatus.WITHDRAWN]: ProposalStage.Withdrawn,
};

/**
 * The schema as used in the governance repository.
 */
export const RawProposalMetadataSchema = z.object({
  cgp: z.number().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  status: z.preprocess((v) => String(v).toUpperCase(), z.nativeEnum(ProposalMetadataStatus)),
  'date-created': z.string().optional().or(z.null()),
  'discussions-to': z.string().url().optional().or(z.null()),
  'governance-proposal-id': z.number().optional().or(z.null()),
  'date-executed': z.string().optional().or(z.null()),
});

/**
 * A refined schema after validating and transforming the raw data
 * Intended to be merged with the Proposal contract type
 */
export interface ProposalMetadata {
  // Overlapping data with Proposal interface
  stage: ProposalStage;
  id?: number; // on-chain id
  timestamp?: number; // create time
  url?: string; // aka discussion url

  // Extra metadata
  cgp: number; // cgp id (different than on-chain)
  cgpUrl: string; // url in repo
  cgpUrlRaw: string; // for downloading content
  title: string;
  author: string;
  timestampExecuted?: number;
  votes?: VoteAmounts;
}

/**
 * TYPES FOR FORMS
 */

export interface UpvoteFormValues {
  proposalId: number;
}

export interface VoteFormValues {
  proposalId: number;
  vote: VoteType;
}
