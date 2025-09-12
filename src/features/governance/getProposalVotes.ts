import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { CacheKeys, StaleTime } from 'src/config/consts';
import database from 'src/config/database';
import { votesTable } from 'src/db/schema';
import { VoteAmounts } from 'src/features/governance/types';

export async function getProposalVotes(chainId: number): Promise<Record<number, VoteAmounts>> {
  const votes = await database
    .select()
    .from(votesTable)
    .where(sql`${votesTable.chainId} = ${chainId}`)
    .orderBy(sql`${votesTable.proposalId} ASC`);

  return votes.reduce(
    (totals, voteRecord) => ({
      ...totals,
      [voteRecord.proposalId]: {
        ...(totals[voteRecord.proposalId] || {}),
        [voteRecord.type]: voteRecord.count,
      },
    }),
    {} as Record<number, VoteAmounts>,
  );
}

export const getCachedVotes = unstable_cache(getProposalVotes, undefined, {
  revalidate: process.env.NODE_ENV === 'production' ? StaleTime.Default / 1000 : 1,
  tags: [CacheKeys.AllVotes],
});
