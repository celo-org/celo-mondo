import 'dotenv/config';

/* eslint no-console: 0 */
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { triggerGovernanceRepoStatusUpdate } from 'src/features/governance/syncGovernanceRepoStatus';
import { celo } from 'viem/chains';

const LOOKBACK_HOURS = 24;

/**
 * Syncs EXECUTED proposals to the governance repository.
 *
 * Finds proposals executed in the last 24 hours and triggers the governance
 * repo workflow to update their status to EXECUTED. Designed to run daily as a
 * GitHub Action at 11 AM UTC.
 */
async function syncExecutedProposals() {
  console.log('Starting sync of executed proposals to governance repo...');

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  console.log(`Looking for proposals executed after ${since}`);

  const executedProposals = await database
    .select({
      id: proposalsTable.id,
      cgp: proposalsTable.cgp,
      executedAt: proposalsTable.executedAt,
    })
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, celo.id),
        isNotNull(proposalsTable.executedAt),
        gte(proposalsTable.executedAt, since),
      ),
    );

  console.log(
    `Found ${executedProposals.length} proposals executed in the last ${LOOKBACK_HOURS} hours`,
  );

  for (const proposal of executedProposals) {
    console.log(`Processing proposal ${proposal.id} (CGP ${proposal.cgp})...`);
    await triggerGovernanceRepoStatusUpdate({
      cgpNumber: proposal.cgp,
      onchainId: proposal.id,
      status: 'EXECUTED',
      executedAt: proposal.executedAt!,
    });
  }

  console.log('✅ Sync complete');
}

syncExecutedProposals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
