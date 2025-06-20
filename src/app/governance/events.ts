'use server';

import { governanceABI } from '@celo/abis';
import { and, eq, or, SQL, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { encodeEventTopics } from 'viem';

type EventName =
  | 'ProposalQueued'
  | 'ProposalDequeued'
  | 'ProposalApproved'
  | 'ProposalExecuted'
  | 'ProposalVoted'
  | 'ProposalVoteRevoked'
  // | 'ProposalVotedV2' -- auto aliasing
  // | 'ProposalVoteRevokedV2' -- auto aliasing
  | 'ProposalUpvoted'
  | 'ProposalUpvoteRevoked'
  | 'ProposalExpired';

export type Event = Awaited<ReturnType<typeof fetchProposalEvents>>[number];

export async function fetchProposalEvents(
  chainId: number,
  event: EventName,
  { proposalId, account }: { proposalId?: bigint; account?: `0x${string}` } = {},
) {
  const topics = getTopics(event, { proposalId, account });

  const filters: SQL[] = [eq(eventsTable.chainId, chainId)];

  if (event === 'ProposalVoted') {
    filters.push(
      or(
        ...[
          eq(eventsTable.eventName, 'ProposalVotedV2'),
          eq(eventsTable.eventName, 'ProposalVoted'),
        ],
      )!,
    );
  } else if (event === 'ProposalVoteRevoked') {
    filters.push(
      or(
        eq(eventsTable.eventName, 'ProposalVoteRevokedV2'),
        eq(eventsTable.eventName, 'ProposalVoteRevoked'),
      )!,
    );
  } else {
    filters.push(eq(eventsTable.eventName, event));
  }

  if (proposalId !== undefined) {
    filters.push(eq(sql`${eventsTable.topics}[2]`, topics[1]));
  }
  if (account !== undefined) {
    filters.push(eq(sql`${eventsTable.topics}[3]`, topics[2]));
  }

  const events = await database
    .select()
    .from(eventsTable)
    .where(and(...filters))
    .limit(1000);

  return events;
}

function getTopics(
  eventName: EventName,
  { proposalId, account }: { proposalId?: bigint; account?: `0x${string}` } = {},
) {
  return encodeEventTopics({
    abi: governanceABI,
    eventName,
    args: { proposalId, account },
  });
}
