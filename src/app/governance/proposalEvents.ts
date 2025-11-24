'use server';

import { and, eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';

export interface ProposalEventBlock {
  proposalId: number;
  blockNumber: bigint;
}

/**
 * Gets all ProposalDequeued events from the database with their block numbers
 */
export async function getProposalDequeuedEvents(chainId: number): Promise<ProposalEventBlock[]> {
  const proposalIdSql = sql`(${eventsTable.args}->>'proposalId')::bigint`;

  const events = await database
    .select({
      proposalId: proposalIdSql.mapWith(Number),
      blockNumber: eventsTable.blockNumber,
    })
    .from(eventsTable)
    .where(and(eq(eventsTable.chainId, chainId), eq(eventsTable.eventName, 'ProposalDequeued')))
    .orderBy(eventsTable.blockNumber);

  return events;
}

/**
 * Gets all ProposalApproved events from the database with their block numbers
 */
export async function getProposalApprovedEvents(chainId: number): Promise<ProposalEventBlock[]> {
  const proposalIdSql = sql`(${eventsTable.args}->>'proposalId')::bigint`;

  const events = await database
    .select({
      proposalId: proposalIdSql.mapWith(Number),
      blockNumber: eventsTable.blockNumber,
    })
    .from(eventsTable)
    .where(and(eq(eventsTable.chainId, chainId), eq(eventsTable.eventName, 'ProposalApproved')))
    .orderBy(eventsTable.blockNumber);

  return events;
}
