/* eslint no-console: 0 */
import { governanceABI } from '@celo/abis';
import { and, eq, inArray } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

async function updateProposalStages() {
  console.log('Starting proposal stage update...');

  // Setup client using the same env var pattern as other scripts
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode),
  });

  // 1. Get all proposals in Referendum or Execution stages from DB
  // These are the only stages that can transition without emitting events
  const activeProposals = await database
    .select()
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, client.chain.id),
        inArray(proposalsTable.stage, [ProposalStage.Referendum, ProposalStage.Execution]),
      ),
    );

  console.log(`Found ${activeProposals.length} active proposals to check`);

  // 2. Get metadata for Withdrawn status
  const cached = (await import('src/config/proposals.json')).default;
  const metadata = await fetchProposalsFromRepo(cached, false);

  // 3. Get all votes for Rejected calculation
  const allVotes = await getProposalVotes(client.chain.id);

  // 4. For each active proposal, query on-chain stage
  const updates: Array<{ id: number; chainId: number; stage: ProposalStage }> = [];

  for (const proposal of activeProposals) {
    try {
      // Query on-chain stage
      let onChainStage = (await client.readContract({
        abi: governanceABI,
        address: Addresses.Governance,
        functionName: 'getProposalStage',
        args: [BigInt(proposal.id)],
      })) as ProposalStage;

      console.log(
        `Proposal ${proposal.id}: DB stage=${proposal.stage}, On-chain stage=${onChainStage}`,
      );

      // Check if proposal should be marked as Rejected (off-chain only stage)
      if (onChainStage === ProposalStage.Expiration) {
        const votes = allVotes[proposal.id];
        if (votes) {
          const yesVotes = votes[VoteType.Yes] || 0n;
          const noVotes = votes[VoteType.No] || 0n;
          if (noVotes >= yesVotes) {
            onChainStage = ProposalStage.Rejected;
            console.log(`  → Marking as Rejected (No: ${noVotes}, Yes: ${yesVotes})`);
          }
        }
      }

      // Check if proposal is withdrawn in metadata (off-chain only stage)
      const meta = metadata.find((m) => m.id === proposal.id || m.cgp === proposal.cgp);
      if (meta && meta.stage === ProposalStage.Withdrawn) {
        onChainStage = ProposalStage.Withdrawn;
        console.log(`  → Marking as Withdrawn (from metadata)`);
      }

      // Only update if stage changed
      if (onChainStage !== proposal.stage) {
        updates.push({
          id: proposal.id,
          chainId: proposal.chainId,
          stage: onChainStage,
        });
        console.log(`  → Stage changed: ${proposal.stage} → ${onChainStage}`);
      }
    } catch (error) {
      console.error(`Error checking proposal ${proposal.id}:`, error);
    }
  }

  // 5. Batch update database using same pattern as updateProposalsInDB.ts
  if (updates.length > 0) {
    console.log(`Updating ${updates.length} proposals...`);
    for (const update of updates) {
      await database
        .update(proposalsTable)
        .set({ stage: update.stage })
        .where(and(eq(proposalsTable.chainId, update.chainId), eq(proposalsTable.id, update.id)));
    }
    console.log('✅ Stage updates complete');
  } else {
    console.log('No stage changes detected');
  }
}

// Run the script
updateProposalStages()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
