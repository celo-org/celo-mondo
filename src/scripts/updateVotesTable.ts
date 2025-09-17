import 'dotenv/config';

import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { VoteType } from 'src/features/governance/types';
import { sumProposalVotes } from 'src/features/governance/utils/votes';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function main() {
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
  const proposalIds = process.argv[2] ? process.argv[2].split(',').map(BigInt) : undefined;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  const proposals = await database
    .select()
    .from(proposalsTable)
    .where(proposalIds ? sql`${proposalsTable.id} in ${proposalIds}` : undefined);

  if (!proposals.length) {
    console.info(
      `No proposals found with ids [${proposalIds?.join(',')}], did you mistype a proposal id?`,
    );
    process.exit(1);
  }

  const rowsToInsert = [] as (typeof votesTable.$inferInsert)[];
  for (const proposal of proposals) {
    const { totals } = await sumProposalVotes(proposal.id);

    rowsToInsert.push(
      ...Object.entries(totals).map(([type, count]) => ({
        type: type as VoteType,
        count,
        chainId: client.chain.id,
        proposalId: proposal.id,
      })),
    );

    console.info('processed proposalId: ', proposal.id, totals);
  }

  const { count } = await database
    .insert(votesTable)
    .values(rowsToInsert)
    .onConflictDoUpdate({
      set: { count: sql`excluded.count` },
      target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
    });

  console.info(`Updated all votes (inserts: ${count}) for ${proposals.length} proposals`);
  process.exit(0);
}

main();
