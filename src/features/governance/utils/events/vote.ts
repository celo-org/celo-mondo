import 'server-only';

import { Event } from 'src/app/governance/events';
import { votesTable } from 'src/db/schema';
import { VoteType } from 'src/features/governance/types';
import { decodeVoteEventLog, fetchProposalVoters } from 'src/features/governance/utils/votes';
import { Chain, PublicClient, Transport } from 'viem';

const ALLOWED_EVENTS = [
  'ProposalVoted',
  'ProposalVotedV2',
  'ProposalVoteRevoked',
  'ProposalVoteRevokedV2',
];
export async function handleVoteEvent(
  eventName: string,
  event: Event,
  client: PublicClient<Transport, Chain>,
): Promise<(typeof votesTable)['$inferInsert'][]> {
  if (!ALLOWED_EVENTS.includes(eventName)) {
    console.info('Not a vote event');
    return [];
  }

  const proposal = decodeVoteEventLog(event);
  if (!proposal || !proposal.proposalId) {
    throw new Error('Couldnt decode the vote event: ' + JSON.stringify(event));
  }

  const { totals } = await fetchProposalVoters(proposal.proposalId);

  return Object.entries(totals).map(([type, count]) => ({
    type: type as VoteType,
    count,
    chainId: client.chain.id,
    proposalId: proposal.proposalId,
  }));
}
