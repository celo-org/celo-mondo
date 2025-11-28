import { governanceABI } from '@celo/abis';
import 'dotenv/config';

/* eslint no-console: 0 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import {
  calculateQuorum,
  fetchThresholds,
  isProposalPassingQuorum,
  parseParticipationParameters,
} from 'src/features/governance/hooks/useProposalQuorum';
import { ProposalStage } from 'src/features/governance/types';
import { getMostRecentProposalStateAndBlockNumber } from 'src/features/governance/updateProposalsInDB';
import { getProposalTransactions } from 'src/features/governance/utils/transactionDecoder';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { readContract } from 'viem/actions';
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
    console.log(allVotes, allVotes[proposal.id]);
    const earliestEvent = (
      await database
        .select()
        .from(eventsTable)
        .where(and(eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposalIds)))
        .orderBy(asc(eventsTable.blockNumber))
        .limit(1)
    )[0];

    const { blockNumber: mostRecentBlockNumber, state } =
      await getMostRecentProposalStateAndBlockNumber(client, proposal.id, earliestEvent);

    const [rawParticipationParameters, thresholds] = await Promise.all([
      readContract(client, {
        abi: governanceABI,
        address: Addresses.Governance,
        functionName: 'getParticipationParameters',
        blockNumber: mostRecentBlockNumber,
      }),
      fetchThresholds(
        client,
        proposal.id,
        await getProposalTransactions(
          proposal.id,
          proposal.transactionCount || 0,
          earliestEvent.blockNumber,
        ),
      ),
    ]);

    const participationParameters = parseParticipationParameters(rawParticipationParameters);
    const quorumVotesRequired = calculateQuorum({
      participationParameters,
      thresholds,
      networkWeight: state[5] || proposal.networkWeight!,
    });

    const passingQuorum = isProposalPassingQuorum({
      votes: allVotes[proposal.id],
      quorumVotesRequired,
    });

    if (proposal.stage === ProposalStage.Executed && !passingQuorum) {
      console.error(`❌ ${proposal.id} - investigate ! Executed but not passing?!`, {
        participationParameters,
        thresholds,
        networkWeight: state[5],
        _networkWeight: proposal.networkWeight,
        earliestEvent,
        mostRecentBlockNumber,
        state,
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
