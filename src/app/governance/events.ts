'use server';

import { governanceABI } from '@celo/abis';
import { and, eq, sql } from 'drizzle-orm';
import { PROPOSAL_V1_MAX_ID } from 'src/config/consts';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { encodeEventTopics } from 'viem';

type Event =
  | 'ProposalQueued'
  | 'ProposalDequeued'
  | 'ProposalApproved'
  | 'ProposalExecuted'
  | 'ProposalVoted'
  | 'ProposalVoteRevoked'
  | 'ProposalVotedV2'
  | 'ProposalVoteRevokedV2'
  | 'ProposalUpvoted'
  | 'ProposalUpvoteRevoked'
  | 'ProposalExpired';

export async function fetchProposalEvents(chainId: number, event: Event, proposalId?: bigint) {
  if (event === 'ProposalVoted') {
    event = proposalId! > PROPOSAL_V1_MAX_ID ? 'ProposalVotedV2' : 'ProposalVoted';
  } else if (event === 'ProposalVoteRevoked') {
    event = proposalId! > PROPOSAL_V1_MAX_ID ? 'ProposalVoteRevokedV2' : 'ProposalVoteRevoked';
  }
  const topics = getTopics(event, proposalId);

  const filters = [eq(eventsTable.eventName, event), eq(eventsTable.chainId, chainId)];

  if (proposalId !== undefined) {
    filters.push(eq(sql`${eventsTable.topics}[2]`, topics[1]));
  }

  const events = await database
    .select()
    .from(eventsTable)
    .where(and(...filters))
    .limit(1000);

  return events;
}

function getTopics(eventName: Event, proposalId?: bigint) {
  return encodeEventTopics({
    abi: governanceABI,
    eventName,
    args: { proposalId },
  });
}
