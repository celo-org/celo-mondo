import 'dotenv/config';

/* eslint no-console: 0 */
import { governanceABI } from '@celo/abis';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { STAGING_MOCK_PROPOSALS_START_ID } from 'src/config/config';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { getOnChainQuorumRequired } from 'src/features/governance/utils/quorum';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

export async function updateProposalStages(
  client: PublicClient<Transport, Chain>,
  /**
   * Client for current-state reads (e.g. getProposalStage).
   * When the archive node is stale, this is a non-archive node like forno
   * that is up-to-date with chain head. Historical reads (e.g. quorum calculation)
   * still go through `client` which must be an archive node.
   * When not provided, defaults to `client`.
   */
  headClient?: PublicClient<Transport, Chain>,
) {
  const currentClient = headClient ?? client;
  console.log('Starting proposal stage update...');

  // 1. Get all proposals in Referendum, Execution, or Expiration stages from DB
  // Referendum/Execution can transition without emitting events.
  // Expiration is included to self-heal proposals that were incorrectly marked as
  // expired when they were actually executed (contract zeroes data after execution).
  const activeProposals = await database
    .select()
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, client.chain.id),
        inArray(proposalsTable.stage, [
          ProposalStage.Referendum,
          ProposalStage.Execution,
          ProposalStage.Expiration,
        ]),
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
      // Query on-chain stage using the head client (current state, no archive needed)
      let onChainStage = (await currentClient.readContract({
        abi: governanceABI,
        address: Addresses.Governance,
        functionName: 'getProposalStage',
        args: [BigInt(proposal.id)],
      })) as ProposalStage;

      console.log(
        `Proposal ${proposal.id}: DB stage=${proposal.stage}, On-chain stage=${onChainStage}`,
      );

      //  4. Check if proposal should be marked as Executed or Rejected (off-chain only stages)
      //  After execution, the Governance contract zeroes all proposal data, causing
      //  getProposalStage() to return Expiration (5) for executed proposals.
      //  We must check for a ProposalExecuted event before concluding it expired.
      if (onChainStage === ProposalStage.Expiration) {
        const [executedEvent] = await database
          .select({ id: eventsTable.transactionHash })
          .from(eventsTable)
          .where(
            and(
              eq(eventsTable.eventName, 'ProposalExecuted'),
              eq(eventsTable.chainId, client.chain.id),
              eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, BigInt(proposal.id)),
            ),
          )
          .limit(1);

        if (executedEvent) {
          onChainStage = ProposalStage.Executed;
          console.log(`  → Marking as Executed (found ProposalExecuted event)`);
        } else {
          // Lazy-load votes only when we encounter a truly expired proposal
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
      }

      // Only update if stage changed
      if (onChainStage !== proposal.stage) {
        // 4.1 Get events related to the proposal in order to calculate quorum.
        // Uses the archive client — may fail if archive node is stale, but that
        // should not block the stage update itself.
        let quorumVotesRequired: bigint | undefined;
        try {
          ({ quorumVotesRequired } = await getOnChainQuorumRequired(client, proposal));
        } catch (quorumError) {
          console.warn(
            `  ⚠️ Could not calculate quorum for proposal ${proposal.id} (archive node may be stale), skipping quorum update`,
          );
        }

        // 4.2
        // Tempurature check / proposals with zero txns do not need to be executed mearly passing quorum is enough.
        // So move them from Execution to Adopted when they leave Execution stage.
        // Txcount 0 + Passed Quorum Flow === Referendum => Execution => Adopted (or Executed if someone bothers to approve and execute it)
        if (
          onChainStage !== ProposalStage.Executed &&
          proposal.stage === ProposalStage.Execution &&
          proposal.transactionCount === 0
        ) {
          onChainStage = ProposalStage.Adopted;
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

/**
 * Returns the best client for current-state reads (e.g. getProposalStage).
 * If the archive node is fresh, returns it directly.
 * If stale (>100 blocks behind), returns a forno-backed client instead.
 */
async function getFreshHeadClient(
  archiveClient: PublicClient<Transport, Chain>,
): Promise<PublicClient<Transport, Chain>> {
  const MAX_BLOCK_LAG = 300;
  try {
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(celo.rpcUrls.default.http[0]),
    }) as PublicClient<Transport, Chain>;
    const [privateBlock, publicBlock] = await Promise.all([
      archiveClient.getBlockNumber(),
      publicClient.getBlockNumber(),
    ]);
    const lag = Number(publicBlock - privateBlock);
    if (lag > MAX_BLOCK_LAG) {
      console.warn(
        `⚠️ Archive node is ${lag} blocks behind (archive: ${privateBlock}, public: ${publicBlock}). Using forno for current-state reads.`,
      );
      return publicClient;
    }
    console.log(`Archive node is fresh (${lag} blocks behind head)`);
    return archiveClient;
  } catch (error) {
    console.warn('⚠️ Could not verify archive node freshness, using archive client:', error);
    return archiveClient;
  }
}

// Run the script when executed directly
if (process.argv[1]?.endsWith('updateProposalStages.ts')) {
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
  const archiveClient = createPublicClient({
    chain: celo,
    transport: http(archiveNode),
  }) as PublicClient<Transport, Chain>;

  getFreshHeadClient(archiveClient)
    .then((headClient) => updateProposalStages(archiveClient, headClient))
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
