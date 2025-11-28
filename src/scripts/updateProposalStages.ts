import 'dotenv/config';

/* eslint no-console: 0 */
import { governanceABI } from '@celo/abis';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import {
  calculateQuorum,
  fetchThresholds,
  parseParticipationParameters,
} from 'src/features/governance/hooks/useProposalQuorum';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { getMostRecentProposalStateAndBlockNumber } from 'src/features/governance/updateProposalsInDB';
import { getProposalTransactions } from 'src/features/governance/utils/transactionDecoder';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { readContract } from 'viem/actions';
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
      ),
    );

  console.log(`Found ${activeProposals.length} active proposals to check`);

  // 2. Lazy-load votes only if needed (for Rejected calculation)
  // Only fetched when we encounter a proposal in Expiration stage
  let allVotes: Awaited<ReturnType<typeof getProposalVotes>> | null = null;

  // 3. For each active proposal, query on-chain stage
  type Update = { id: number; chainId: number; stage: ProposalStage; quorumVotesRequired: bigint };
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
          if (noVotes >= yesVotes) {
            onChainStage = ProposalStage.Rejected;
            console.log(`  → Marking as Rejected (No: ${noVotes}, Yes: ${yesVotes})`);
          }
        }
      }

      // 4.1 Get events related to the proposal
      const events = await database
        .select()
        .from(eventsTable)
        .where(and(eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id)))
        .orderBy(asc(eventsTable.blockNumber));
      const earliestBlockNumber = events[0].blockNumber;
      const { blockNumber: mostRecentBlockNumber, state } =
        await getMostRecentProposalStateAndBlockNumber(client, proposal.id, events.at(-1)!);

      // 4.2 Check if the proposal was passing or not
      const [rawParticipationParameters, thresholds] = await Promise.all([
        readContract(client, {
          abi: governanceABI,
          address: Addresses.Governance,
          functionName: 'getParticipationParameters',
          blockNumber: mostRecentBlockNumber,
        }),
        fetchThresholds(
          client as PublicClient,
          proposal.id,
          await getProposalTransactions(
            proposal.id,
            proposal.transactionCount || 0,
            earliestBlockNumber,
          ),
        ),
      ]);

      const participationParameters = parseParticipationParameters(rawParticipationParameters);
      const quorumVotesRequired = calculateQuorum({
        participationParameters,
        thresholds,
        networkWeight: state[5] || proposal.networkWeight!,
      });

      // Only update if stage changed
      if (onChainStage !== proposal.stage) {
        updates.push({
          id: proposal.id,
          chainId: proposal.chainId,
          stage: onChainStage,
          quorumVotesRequired,
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
          quorumVotesRequired: update.quorumVotesRequired,
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
