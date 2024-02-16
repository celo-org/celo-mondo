import { Proposal, ProposalStage } from 'src/features/governance/contractTypes';
import { z } from 'zod';

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
  id?: number;
  timestamp?: number;
  url?: string;

  // Extra metadata
  cgp: number;
  title: string;
  author: string;
  timestampExecuted?: number;
}

export type ProposalWithMetadata = Proposal & ProposalMetadata;
