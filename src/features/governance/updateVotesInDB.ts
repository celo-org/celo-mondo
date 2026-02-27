/* eslint no-console: 0 */

import { inArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';

import { VoteType } from 'src/features/governance/types';

import { revalidateTag } from 'next/cache';
import { CacheKeys } from 'src/config/consts';
import { sumProposalVotes } from 'src/features/governance/utils/votes';
import '../../vendor/polyfill';

export default async function updateVotesInDB(
  chainId: number,
  proposalIds: bigint[],
): Promise<void> {
  // Filter to only proposals that exist in the DB to avoid FK violations
  const existingProposals = await database
    .select({ id: proposalsTable.id })
    .from(proposalsTable)
    .where(
      inArray(
        proposalsTable.id,
        proposalIds.map((id) => Number(id)),
      ),
    );
  const existingIds = new Set(existingProposals.map((p) => p.id));
  const skippedIds = proposalIds.filter((id) => !existingIds.has(Number(id)));
  if (skippedIds.length) {
    console.info(
      `Skipping votes for ${skippedIds.length} non-existent proposal(s): [${skippedIds.join(', ')}]`,
    );
  }

  for (const proposalId of proposalIds) {
    if (!existingIds.has(Number(proposalId))) {
      continue;
    }
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
      continue;
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
