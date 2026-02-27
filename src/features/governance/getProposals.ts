import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { Proposal, proposalsTable } from 'src/db/schema';
import { ProposalStage } from 'src/features/governance/types';

/**
 * PostgreSQL `timestamp` (without timezone) strips the "Z" suffix when storing
 * ISO strings, so drizzle returns e.g. "2026-02-20 18:49:00" with no timezone.
 * JavaScript's `new Date()` treats such strings as LOCAL time, causing an offset
 * equal to the user's UTC offset (e.g. 8 hours for PST).
 *
 * This function ensures the string is parsed as UTC.
 */
function ensureUTC(ts: string): string {
  if (ts.endsWith('Z') || ts.includes('+') || /-\d{2}:\d{2}$/.test(ts)) {
    return ts;
  }
  return ts.replace(' ', 'T') + 'Z';
}

function findHistory(
  proposals: Proposal[],
  pastId?: number | null,
): { id: number; stage: ProposalStage }[] {
  const history: { id: number; stage: ProposalStage }[] = [];
  if (!pastId) {
    return history;
  }

  const initialPastId = pastId;
  do {
    const pastProposal = proposals.find((proposal) => proposal.id === pastId);
    if (!pastProposal) {
      break;
    }
    history.push({ id: pastId, stage: pastProposal.stage });
    pastId = pastProposal.pastId;

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
    // Normalize timestamps so clients parse them as UTC, not local time
    if (p.queuedAt) p.queuedAt = ensureUTC(p.queuedAt);
    if (p.dequeuedAt) p.dequeuedAt = ensureUTC(p.dequeuedAt);
    if (p.approvedAt) p.approvedAt = ensureUTC(p.approvedAt);
    if (p.executedAt) p.executedAt = ensureUTC(p.executedAt);
    (p as ProposalWithHistory).history = findHistory(proposals, p.pastId);
  });

  return proposals.sort((a, b) => b.id - a.id) as ProposalWithHistory[];
}
