/* eslint no-console: 0 */

import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { votesTable } from 'src/db/schema';

import { VoteType } from 'src/features/governance/types';

import { sumProposalVotes } from 'src/features/governance/utils/votes.js';
import '../../vendor/polyfill.js';

export default async function updateVotesInDB(
  chainId: number,
  proposalIds: bigint[],
): Promise<void> {
  for (const proposalId of proposalIds) {
    const { totals } = await sumProposalVotes(Number(proposalId));

    const rows = Object.entries(totals).map(([type, count]) => ({
      type: type as VoteType,
      count,
      chainId,
      proposalId: Number(proposalId),
    }));

    const { count } = await database
      .insert(votesTable)
      .values(rows)
      .onConflictDoUpdate({
        set: { count: sql`excluded.count` },
        target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
      });
    console.info(`Inserted ${count} vote records for proposal: ${rows[0].proposalId}`);
  }
}
