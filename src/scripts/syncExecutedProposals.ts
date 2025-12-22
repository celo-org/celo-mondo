import 'dotenv/config';

/* eslint no-console: 0 */
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { triggerGovernanceRepoStatusUpdate } from 'src/features/governance/syncGovernanceRepoStatus';
import { celo } from 'viem/chains';

/**
 * Syncs EXECUTED proposals to the governance repository
 *
 * Finds proposals executed in the last 24 hours and triggers the
 * governance repo workflow to update their status to EXECUTED.
 *
 * Designed to run daily as a GitHub Action at 11 AM UTC.
 */
async function syncExecutedProposals() {
  console.log('Starting sync of executed proposals to governance repo...');

  try {
    // Calculate timestamp for 24 hours ago
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const oneDayAgoString = oneDayAgo.toISOString();

    console.log(`Looking for proposals executed after ${oneDayAgoString}`);

    // Get proposals that were executed in the last 24 hours
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
          isNotNull(proposalsTable.cgp),
          isNotNull(proposalsTable.executedAt),
          gte(proposalsTable.executedAt, oneDayAgoString),
        ),
      );

    console.log(`Found ${executedProposals.length} proposals executed in the last 24 hours`);

    if (executedProposals.length === 0) {
      console.log('No recently executed proposals found');
      return;
    }

    // Trigger workflow for each executed proposal
    for (const proposal of executedProposals) {
      console.log(`Processing proposal ${proposal.id} (CGP ${proposal.cgp})...`);
      await triggerGovernanceRepoStatusUpdate({
        cgpNumber: Number(proposal.cgp),
        onchainId: proposal.id,
        status: 'EXECUTED',
        executedAt: proposal.executedAt!,
      });
    }

    console.log('\n✅ Sync complete');
  } catch (error) {
    console.error('Script failed:', error);
    throw error;
  }
}

// Run the script
syncExecutedProposals()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
