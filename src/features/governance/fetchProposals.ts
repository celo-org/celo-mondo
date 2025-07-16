'use server';

import { and, eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { VoteAmounts, VoteType } from 'src/features/governance/types';

export async function fetchProposals(chainId: number) {
  const results = await database
    .select({
      proposal: proposalsTable,
      votes: votesTable,
    })
    .from(proposalsTable)
    .where(sql`${proposalsTable.chainId} = ${chainId}`)
    .orderBy(sql`${proposalsTable.id} DESC`)
    .leftJoin(
      votesTable,
      and(
        eq(votesTable.proposalId, proposalsTable.id),
        eq(votesTable.chainId, proposalsTable.chainId),
      ),
    );

  const proposalsMap = results.reduce(
    (acc, row) => {
      const { proposal, votes } = row;
      if (!acc.has(proposal.id)) {
        acc.set(proposal.id, {
          ...proposal,
          votes: {
            [VoteType.Yes]: 0n,
            [VoteType.No]: 0n,
            [VoteType.Abstain]: 0n,
          },
          history: [],
        });
      }
      if (votes) {
        // NOTE: trim VoteType.None
        const type = votes.type as keyof VoteAmounts;
        acc.get(proposal.id)!.votes[type] = votes.count;
      }
      if (proposal.pastId && acc.has(proposal.pastId)) {
        acc.get(proposal.id)!.history.push(proposal.pastId);
      }
      return acc;
    },
    new Map<
      number,
      typeof proposalsTable.$inferSelect & {
        votes: VoteAmounts;
        history: number[];
      }
    >(),
  );

  return [...proposalsMap.entries()].map((x) => x[1]);
}
