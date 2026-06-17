/* eslint no-console: 0 */

import { and, eq, gt, inArray, isNotNull, notInArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import { Chain, PublicClient, Transport } from 'viem';

/**
 * Self-heal: find proposals that have events but no row in proposalsTable.
 * This happens when metadata wasn't available at the time the event was first processed.
 */
export async function selfHealOrphanedProposals(
  client: PublicClient<Transport, Chain>,
): Promise<bigint[]> {
  const rawProposalId = sql`${eventsTable.args}->>'proposalId'`;
  const proposalIdSql = sql`(${rawProposalId})::bigint`;
  const orphanedProposals = await database
    .selectDistinct({ proposalId: proposalIdSql.mapWith(Number) })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.chainId, client.chain.id),
        inArray(eventsTable.eventName, [
          'ProposalQueued',
          'ProposalDequeued',
          'ProposalApproved',
          'ProposalExecuted',
          'ProposalExpired',
        ]),
        isNotNull(rawProposalId),
        gt(proposalIdSql, 149),
        notInArray(
          proposalIdSql,
          database
            .select({ id: proposalsTable.id })
            .from(proposalsTable)
            .where(eq(proposalsTable.chainId, client.chain.id)),
        ),
      ),
    );

  if (orphanedProposals.length) {
    const orphanedIds = orphanedProposals.map((p) => BigInt(p.proposalId));
    console.info(
      `Self-healing: found ${orphanedIds.length} orphaned proposal(s): [${orphanedIds.join(', ')}]`,
    );
    await updateProposalsInDB(client, orphanedIds, 'update');
    return orphanedIds;
  }

  console.info('Self-healing: no orphaned proposals found');
  return [];
}
