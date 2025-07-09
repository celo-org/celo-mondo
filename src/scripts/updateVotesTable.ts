import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { fetchProposalVoters } from 'src/features/governance/hooks/useProposalVoters';
import { VoteType } from 'src/features/governance/types';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function main() {
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  const proposals = await database.select().from(proposalsTable);

  const rowsToInsert = [] as (typeof votesTable.$inferInsert)[];
  for (const proposal of proposals) {
    const votes = await fetchProposalVoters(proposal.id);

    rowsToInsert.push(
      ...Object.entries(votes.totals).map(([type, count]) => ({
        type: type as VoteType,
        count,
        chainId: client.chain.id,
        proposalId: proposal.id,
      })),
    );

    console.log('processed proposalId: ', proposal.id, votes.totals);
  }

  const { count } = await database
    .insert(votesTable)
    .values(rowsToInsert)
    .onConflictDoUpdate({
      set: { count: sql`excluded.count` },
      target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
    });

  console.log(`Updated all votes (inserts: ${count}) for ${proposals.length} proposals`);
  process.exit(0);
}

main();
