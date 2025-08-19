'use server';

import { and, eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { VoteAmounts, VoteType } from 'src/features/governance/types';

function findHistory(
  proposals: (typeof proposalsTable.$inferSelect)[],
  pastId?: number | null,
): number[] {
  const history: number[] = [];
  if (!pastId) {
    return history;
  }

  while (pastId) {
    if (history.includes(pastId)) {
      // NOTE: this should never happen, however since the DB can be edited manually
      // there could be a infinite loop due to a typo (eg: 1->2, 2->1)
      break;
    }
    history.push(pastId);
    pastId = proposals.find((proposal) => proposal.id === pastId)?.pastId;
  }

  return history;
}

export async function getProposals(chainId: number) {
  const results = await database
    .select({
      proposal: proposalsTable,
      votes: votesTable,
    })
    .from(proposalsTable)
    .where(sql`${proposalsTable.chainId} = ${chainId}`)
    .orderBy(sql`${proposalsTable.id} ASC`)
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
      const history = acc.get(proposal.id)!.history;
      if (proposal.pastId && !history.includes(proposal.pastId)) {
        history.unshift(proposal.pastId); // more recent ids first in the array
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

  const proposals = [...proposalsMap.entries()].map((x) => x[1]);
  proposals.forEach((p) => {
    p.history = findHistory(proposals, p.pastId);
  });
  return proposals.sort((a, b) => b.id - a.id);
}
