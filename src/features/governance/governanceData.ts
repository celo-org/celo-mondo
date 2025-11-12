import {
  EXECUTION_STAGE_EXPIRY_TIME,
  QUEUED_STAGE_EXPIRY_TIME,
  REFERENDUM_STAGE_EXPIRY_TIME,
} from 'src/config/consts';
import { Proposal, ProposalMetadata, ProposalStage } from 'src/features/governance/types';

const ID_PARAM_REGEX = /^(cgp-)?(\d+)$/;

export function findProposal(proposals: MergedProposalData[] | undefined, id: string) {
  if (!proposals || !id) return undefined;
  const matches = new RegExp(ID_PARAM_REGEX).exec(id);
  if (matches?.[1] === 'cgp-') {
    const cgpId = parseInt(matches[2]);
    return proposals.find((p) => p.metadata?.cgp === cgpId);
  } else if (matches?.[2]) {
    const propId = parseInt(matches[2]);
    return proposals.find((p) => p.proposal?.id === propId);
  } else {
    return undefined;
  }
}
export type MergedProposalData = { stage: ProposalStage; id?: number } & (
  | { proposal: Proposal; metadata?: ProposalMetadata; history?: undefined }
  | { proposal?: Proposal; metadata: ProposalMetadata; history?: undefined }
  | {
      proposal: Proposal;
      metadata: ProposalMetadata;
      history?: { id: number; stage: ProposalStage }[];
    }
);

/**
 * Returns the timestamp when the current stage ends (not when proposal expires).
 *
 * IMPORTANT: The proposalTimestamp parameter is the proposal's base timestamp, which is:
 * - For Queued stage: the time when proposal was queued
 * - For dequeued stages (Referendum/Execution/Expiration): the time when proposal was dequeued
 *
 * This is NOT the start time of the current stage, but the reference point for calculating stage durations.
 *
 * Stage transitions (from Governance.sol contract):
 * - Queued: 28 days → Expiration
 * - Referendum: 7 days → Execution
 * - Execution: 3 days more (10 days total from dequeue) → Expiration
 *
 * @param stage - Current proposal stage
 * @param proposalTimestamp - Proposal's base timestamp in milliseconds (queue or dequeue time)
 * @returns Timestamp in milliseconds when stage ends, or undefined if terminal/unknown
 */
export function getStageEndTimestamp(
  stage: ProposalStage,
  proposalTimestamp: number,
): number | undefined {
  if (stage === ProposalStage.Queued) {
    return proposalTimestamp + QUEUED_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Approval) {
    return proposalTimestamp + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Referendum || stage === ProposalStage.Expiration) {
    return proposalTimestamp + REFERENDUM_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Execution) {
    // NOTE: it seems once approved and passing (thus in Execution stage)
    // they can't quite expire?
    return undefined;
  } else {
    return undefined;
  }
}

// Backwards compatibility alias
export const getExpiryTimestamp = getStageEndTimestamp;
