/* eslint no-console: 0 */
import { and, eq, gte, inArray, lt, lte, or } from 'drizzle-orm';
import { STAGING_MOCK_PROPOSALS_START_ID } from 'src/config/config';
import { EXECUTION_STAGE_EXPIRY_TIME, REFERENDUM_STAGE_EXPIRY_TIME } from 'src/config/consts';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import {
  fetchGovernanceRepoStatus,
  GovernanceStatusUpdate,
  triggerGovernanceRepoStatusUpdate,
} from 'src/features/governance/syncGovernanceRepoStatus';
import { ProposalMetadataStatus, ProposalStage } from 'src/features/governance/types';
import { celo } from 'viem/chains';

const HOUR_MS = 60 * 60 * 1000;
// A proposal settles within ten days of being dequeued, so a month covers every
// recent outcome and leaves weeks of daily retries for a dispatch that failed.
const LOOKBACK_MS = 30 * 24 * HOUR_MS;
// The execution event reaches the database on the hourly backfill. Until it has
// had time to land, an executed proposal still looks expired here.
const SETTLE_MS = 6 * HOUR_MS;

const STAGE_TO_STATUS: Partial<Record<ProposalStage, ProposalMetadataStatus>> = {
  [ProposalStage.Executed]: ProposalMetadataStatus.EXECUTED,
  [ProposalStage.Expiration]: ProposalMetadataStatus.EXPIRED,
  [ProposalStage.Rejected]: ProposalMetadataStatus.REJECTED,
};

/**
 * Pushes the outcome of recently settled proposals to the governance repository.
 *
 * Reads the status each CGP currently carries there and dispatches an update only
 * when it differs, so the daily run is idempotent and a failed dispatch is simply
 * retried the next day.
 */
export async function reconcileGovernanceRepoStatus(now = new Date()): Promise<void> {
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();
  const settledBefore = new Date(
    now.getTime() - REFERENDUM_STAGE_EXPIRY_TIME - EXECUTION_STAGE_EXPIRY_TIME - SETTLE_MS,
  ).toISOString();

  const proposals = await database
    .select({
      id: proposalsTable.id,
      cgp: proposalsTable.cgp,
      stage: proposalsTable.stage,
      executedAt: proposalsTable.executedAt,
    })
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, celo.id),
        lt(proposalsTable.id, STAGING_MOCK_PROPOSALS_START_ID),
        gte(proposalsTable.dequeuedAt, since),
        or(
          eq(proposalsTable.stage, ProposalStage.Executed),
          and(
            inArray(proposalsTable.stage, [ProposalStage.Expiration, ProposalStage.Rejected]),
            lte(proposalsTable.dequeuedAt, settledBefore),
          ),
        ),
      ),
    );

  console.log(`Found ${proposals.length} settled proposals dequeued since ${since}`);

  for (const proposal of proposals) {
    const status = STAGE_TO_STATUS[proposal.stage];
    if (!status) continue;

    const current = await fetchGovernanceRepoStatus(proposal.cgp);
    if (current === null || current === status) continue;
    if (current === ProposalMetadataStatus.EXECUTED) {
      console.log(`⚠️  CGP ${proposal.cgp} is executed in the governance repo, leaving it alone`);
      continue;
    }

    const update = toUpdate(proposal, status);
    if (!update) {
      console.log(`⚠️  Proposal ${proposal.id} is executed without an execution time, skipping`);
      continue;
    }
    await triggerGovernanceRepoStatusUpdate(update);
  }
}

function toUpdate(
  proposal: { id: number; cgp: number; executedAt: string | null },
  status: ProposalMetadataStatus,
): GovernanceStatusUpdate | null {
  const base = { cgpNumber: proposal.cgp, onchainId: proposal.id };
  if (status === ProposalMetadataStatus.EXECUTED) {
    return proposal.executedAt ? { ...base, status, executedAt: proposal.executedAt } : null;
  }
  if (status === ProposalMetadataStatus.EXPIRED || status === ProposalMetadataStatus.REJECTED) {
    return { ...base, status };
  }
  return null;
}
