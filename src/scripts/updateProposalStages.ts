import 'dotenv/config';

/* eslint no-console: 0 */
import { governanceABI } from '@celo/abis';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { STAGING_MOCK_PROPOSALS_START_ID } from 'src/config/config';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { getOnChainQuorumRequired } from 'src/features/governance/utils/quorum';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function updateProposalStages() {
  console.log('Starting proposal stage update...');

  // Setup client using the same env var pattern as other scripts
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode),
  }) as PublicClient<Transport, Chain>;

  // 1. Get all proposals in Referendum or Execution stages from DB
  // These are the only stages that can transition without emitting events
  const activeProposals = await database
    .select()
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, client.chain.id),
        inArray(proposalsTable.stage, [ProposalStage.Referendum, ProposalStage.Execution]),
        lt(proposalsTable.id, STAGING_MOCK_PROPOSALS_START_ID),
      ),
    );

  console.log(`Found ${activeProposals.length} active proposals to check`);

  // 2. Lazy-load votes only if needed (for Rejected calculation)
  // Only fetched when we encounter a proposal in Expiration stage
  let allVotes: Awaited<ReturnType<typeof getProposalVotes>> | null = null;

  // 3. For each active proposal, query on-chain stage
  type Update = { id: number; chainId: number; stage: ProposalStage; quorumVotesRequired?: bigint };
  const updates: Update[] = [];

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

      //  4. Check if proposal should be marked as Rejected (off-chain only stage)
      if (onChainStage === ProposalStage.Expiration) {
        // Lazy-load votes only when we encounter an expired proposal
        if (!allVotes) {
          console.log('Found expired proposal, loading votes for Rejected calculation...');
          allVotes = await getProposalVotes(client.chain.id);
        }

        const votes = allVotes[proposal.id];
        if (votes) {
          const yesVotes = votes[VoteType.Yes] || 0n;
          const noVotes = votes[VoteType.No] || 0n;
          if (noVotes > yesVotes) {
            onChainStage = ProposalStage.Rejected;
            console.log(`  → Marking as Rejected (No: ${noVotes}, Yes: ${yesVotes})`);
          }
        }
      }

      // Only update if stage changed
      if (onChainStage !== proposal.stage) {
        // 4.1 Get events related to the proposal in order to calculate quorum
        const { quorumVotesRequired } = await getOnChainQuorumRequired(client, proposal);

        // 4.2
        // Tempurature check / proposals with zero txns do not need to be executed mearly passing quorum is enough.
        // So move them from Execution to Adopted when they leave Execution stage.
        // Txcount 0 + Passed Quorum Flow === Referendum => Execution => Adopted (or Executed if someone bothers to approve and execute it)
        if (
          onChainStage !== ProposalStage.Executed &&
          proposal.stage === ProposalStage.Execution &&
          proposal.transactionCount === 0
        ) {
          onChainStage === ProposalStage.Adopted;
        }

        updates.push({
          id: proposal.id,
          chainId: proposal.chainId,
          stage: onChainStage,
          ...(quorumVotesRequired && { quorumVotesRequired }),
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
        .set({
          stage: update.stage,
          ...(update.quorumVotesRequired && { quorumVotesRequired: update.quorumVotesRequired }),
        })
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
