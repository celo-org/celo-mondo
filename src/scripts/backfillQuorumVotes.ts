import 'dotenv/config';

/* eslint no-console: 0 */
import { and, eq, inArray } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { isProposalPassingQuorum } from 'src/features/governance/hooks/useProposalQuorum';
import { ProposalStage } from 'src/features/governance/types';
import { getOnChainQuorumRequired } from 'src/features/governance/utils/quorum';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

const API_TOKEN = process.env.ETHERSCAN_API_TOKEN;
if (!API_TOKEN) {
  throw new Error('env.ETHERSCAN_API_TOKEN is required for this script');
}

async function backfillpassingQuorum() {
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;
  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 60_000, // 1 minute - archive nodes can be slow
    }),
  }) as PublicClient<Transport, Chain>;

  const proposalIds = process.argv[2]
    ? process.argv[2].split(',').map((x) => parseInt(x, 10))
    : undefined;
  console.log(
    `Starting backfilling quorum passing status ${proposalIds ? `for ids ${proposalIds.join(', ')}` : ''}…`,
  );

  const conditions = [
    eq(proposalsTable.chainId, celo.id),
    inArray(proposalsTable.stage, [ProposalStage.Executed, ProposalStage.Expiration]),
  ];

  if (proposalIds) {
    conditions.push(inArray(proposalsTable.id, proposalIds));
  }
  const proposals = await database
    .select()
    .from(proposalsTable)
    .where(and(...conditions))
    .orderBy(proposalsTable.id);

  const allVotes = await getProposalVotes(client.chain.id);

  // 3. For each active proposal, query on-chain stage
  type Update = { id: number; chainId: number; quorumVotesRequired: bigint };
  const updates: Update[] = [];
  for (const proposal of proposals) {
    const { quorumVotesRequired, participationParameters, thresholds, networkWeight } =
      await getOnChainQuorumRequired(client, proposal);

    const passingQuorum = isProposalPassingQuorum({
      votes: allVotes[proposal.id],
      quorumVotesRequired,
    });

    if (proposal.stage === ProposalStage.Executed && !passingQuorum) {
      console.error(`❌ ${proposal.id} - investigate ! Executed but not passing?!`, {
        participationParameters,
        thresholds,
        networkWeight,
      });
    } else {
      console.log(
        `ℹ️ ${proposal.id} - ${passingQuorum ? 'passing' : 'not passing'} (${ProposalStage[proposal.stage]} - ${quorumVotesRequired})`,
      );
    }

    updates.push({
      id: proposal.id,
      chainId: proposal.chainId,
      quorumVotesRequired,
    });
  }

  if (updates.length > 0) {
    console.log(`Updating ${updates.length} proposals...`);
    for (const update of updates) {
      await database
        .update(proposalsTable)
        .set({
          quorumVotesRequired: update.quorumVotesRequired,
        })
        .where(and(eq(proposalsTable.chainId, update.chainId), eq(proposalsTable.id, update.id)));
    }
    console.log('✅ Quorum passing status updates complete');
  } else {
    console.log('No quorum passing status changes detected');
  }
}

// Run the script
backfillpassingQuorum()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
