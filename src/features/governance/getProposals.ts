'use server';

import { and, eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable, votesTable } from 'src/db/schema';
import { ProposalStage, VoteAmounts, VoteType } from 'src/features/governance/types';

function findHistory(
  proposals: (typeof proposalsTable.$inferSelect)[],
  pastId?: number | null,
): { id: number; stage: ProposalStage }[] {
  const history: { id: number; stage: ProposalStage }[] = [];
  if (!pastId) {
    return history;
  }

  const initialPastId = pastId!;
  do {
    const pastProposal = proposals.find((proposal) => proposal.id === pastId);
    history.push({ id: pastId, stage: pastProposal!.stage });
    pastId = pastProposal!.pastId;

    if (pastId && pastId >= initialPastId) {
      // NOTE: this should never happen, however since the DB can be edited manually
      // there could be a infinite loop due to a typo (eg: 1->2->1 or 1->1)
      break;
    }
  } while (pastId);

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
      return acc;
    },
    new Map<
      number,
      typeof proposalsTable.$inferSelect & {
        votes: VoteAmounts;
        history: { id: number; stage: ProposalStage }[];
      }
    >(),
  );

  const proposals = [...proposalsMap.entries()].map((x) => x[1]);
  proposals.forEach((p) => {
    p.history = findHistory(proposals, p.pastId);
  });
  return proposals.sort((a, b) => b.id - a.id);
}
