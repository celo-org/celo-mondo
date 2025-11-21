import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { CacheKeys, StaleTime } from 'src/config/consts';
import database from 'src/config/database';
import { Proposal, proposalsTable } from 'src/db/schema';
import { ProposalStage } from 'src/features/governance/types';

function findHistory(
  proposals: Proposal[],
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

export interface ProposalWithHistory extends Proposal {
  history: { id: number; stage: ProposalStage }[];
}

export async function getProposals(chainId: number): Promise<ProposalWithHistory[]> {
  const proposals = await database
    .select()
    .from(proposalsTable)
    .where(sql`${proposalsTable.chainId} = ${chainId}`)
    .orderBy(sql`${proposalsTable.id} ASC`);
  proposals.forEach((p) => {
    (p as ProposalWithHistory).history = findHistory(proposals, p.pastId);
  });

  return proposals.sort((a, b) => b.id - a.id) as ProposalWithHistory[];
}

export const getCachedProposals = unstable_cache(getProposals, undefined, {
  revalidate: process.env.NODE_ENV === 'production' ? StaleTime.Default / 1000 : 1,
  tags: [CacheKeys.AllProposals],
});
