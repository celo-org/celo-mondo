import {
  APPROVAL_STAGE_EXPIRY_TIME,
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

export function getExpiryTimestamp(stage: ProposalStage, timestamp: number) {
  if (stage === ProposalStage.Queued) {
    return timestamp + QUEUED_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Approval) {
    return timestamp + APPROVAL_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Referendum) {
    return timestamp + REFERENDUM_STAGE_EXPIRY_TIME;
  } else if (stage === ProposalStage.Execution) {
    return timestamp + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME;
  } else {
    return undefined;
  }
} // proposer, deposit, timestamp, numTransactions, url, networkWeight, isApproved

export type ProposalRaw = [Address, bigint, bigint, bigint, string, bigint, boolean];
// Yes, no, abstain
export type VoteTotalsRaw = [bigint, bigint, bigint];
