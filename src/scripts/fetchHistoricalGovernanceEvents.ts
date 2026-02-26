/* eslint no-console: 0 */
import 'dotenv/config';

import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import updateVotesInDB from 'src/features/governance/updateVotesInDB';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function main() {
  let fromBlock: bigint | undefined;

  if (process.env.RESUME_FROM_BLOCK) {
    fromBlock = BigInt(process.env.RESUME_FROM_BLOCK);
  }
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  const proposalIdsChanged: bigint[] = [];
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalQueued', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalDequeued', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalApproved', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalExecuted', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalExpired', client, fromBlock)),
  );

  const proposalIdsVoteChanged: bigint[] = [];
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVoted', client, fromBlock)),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively(
      'ProposalVoteRevoked',
      client,
      fromBlock,
    )),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVotedV2', client, fromBlock)),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively(
      'ProposalVoteRevokedV2',
      client,
      fromBlock,
    )),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalUpvoted', client, fromBlock)),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively(
      'ProposalUpvoteRevoked',
      client,
      fromBlock,
    )),
  );

  if (proposalIdsChanged.length) {
    await updateProposalsInDB(client, [...new Set(proposalIdsChanged)], 'update');
  }
  if (proposalIdsVoteChanged.length) {
    await updateVotesInDB(client.chain.id, [...new Set(proposalIdsVoteChanged)]);
  }

  await selfHealOrphanedProposals(client);

  process.exit(0);
}

main();

/**
 * Self-heal: find proposals that have events but no row in proposalsTable.
 * This happens when metadata wasn't available at the time the event was first processed.
 */
export async function selfHealOrphanedProposals(
  client: PublicClient<Transport, Chain>,
): Promise<bigint[]> {
  const proposalIdSql = sql`(${eventsTable.args}->>'proposalId')::bigint`;
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
