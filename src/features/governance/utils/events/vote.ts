import { Event } from 'src/app/governance/events';
import { votesTable } from 'src/db/schema';
import { VoteType } from 'src/features/governance/types';
import {
  assertEvent,
  decodeVoteEventLog,
  sumProposalVotes,
} from 'src/features/governance/utils/votes';

const ALLOWED_EVENTS = [
  'ProposalVoted',
  'ProposalVotedV2',
  'ProposalVoteRevoked',
  'ProposalVoteRevokedV2',
] as const;
export async function decodeAndPrepareVoteEvent(
  eventName: string,
  event: Event,
  chainId: number,
): Promise<(typeof votesTable)['$inferInsert'][]> {
  if (!assertEvent(ALLOWED_EVENTS, eventName)) {
    console.info('Not a vote event');
    return [];
  }

  const proposal = decodeVoteEventLog(event);
  if (!proposal || !proposal.proposalId) {
    throw new Error('Couldnt decode the vote event: ' + JSON.stringify(event));
  }

  const { totals } = await sumProposalVotes(proposal.proposalId);

  return Object.entries(totals).map(([type, count]) => ({
    type: type as VoteType,
    count,
    chainId,
    proposalId: proposal.proposalId,
  }));
}
