import {
  EXECUTION_STAGE_EXPIRY_TIME,
  QUEUED_STAGE_EXPIRY_TIME,
  REFERENDUM_STAGE_EXPIRY_TIME,
} from 'src/config/consts';
import { type ProposalWithHistory } from 'src/features/governance/getProposals';
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
export type MergedProposalData = ProposalWithHistory &
  (
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
  switch (stage) {
    case ProposalStage.Queued:
      // Queue expires after 28 days from queue time
      return proposalTimestamp + QUEUED_STAGE_EXPIRY_TIME;

    case ProposalStage.Referendum:
      // Voting ends after 7 days from dequeue time, then transitions to Execution
      return proposalTimestamp + REFERENDUM_STAGE_EXPIRY_TIME;

    case ProposalStage.Approval:
    // DEPRECATED: Treat like Execution (awaiting execution after approval)
    // Fall through to Execution case
    case ProposalStage.Execution:
      // Execution window ends after 10 days total from dequeue (7 referendum + 3 execution)
      return proposalTimestamp + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME;

    case ProposalStage.Expiration:
      // Already expired - show when it expired (10 days from dequeue)
      return proposalTimestamp + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME;

    case ProposalStage.Executed:
    case ProposalStage.Withdrawn:
    case ProposalStage.Rejected:
    case ProposalStage.None:
      // Terminal stages - no end time
      return undefined;

    default:
      return undefined;
  }
}

// Backwards compatibility alias
export const getExpiryTimestamp = getStageEndTimestamp;
