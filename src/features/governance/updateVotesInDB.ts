/* eslint no-console: 0 */

import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { votesTable } from 'src/db/schema';

import { VoteType } from 'src/features/governance/types';

import { revalidateTag } from 'next/cache';
import { CacheKeys } from 'src/config/consts';
import { sumProposalVotes } from 'src/features/governance/utils/votes';
import '../../vendor/polyfill';

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

    if (process.env.NODE_ENV === 'test') {
      console.info('not revalidating cache in test mode');
      return;
    } // Revalidate the cache
    if (process.env.CI === 'true') {
      const BASE_URL = process.env.IS_PRODUCTION_DATABASE
        ? 'https://mondo.celo.org'
        : 'https://preview-celo-mondo.vercel.app';
      await fetch(`${BASE_URL}/api/governance/proposals`, { method: 'DELETE' });
    } else {
      try {
        revalidateTag(CacheKeys.AllVotes);
      } catch {
        console.info('skipped cache purge');
      }
    }
  }
}
