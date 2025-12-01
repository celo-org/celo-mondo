import { governanceABI } from '@celo/abis';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import {
  calculateQuorum,
  fetchThresholds,
  parseParticipationParameters,
} from 'src/features/governance/hooks/useProposalQuorum';
import { getProposalOnChain } from 'src/features/governance/updateProposalsInDB';
import { getProposalTransactions } from 'src/features/governance/utils/transactionDecoder';
import { Chain, PublicClient, Transport } from 'viem';
import { readContract } from 'viem/actions';

export async function getOnChainQuorumRequired(
  client: PublicClient<Transport, Chain>,
  proposal: typeof proposalsTable.$inferInsert,
) {
  const [lastVoteEvent, approvedEvent] = await Promise.all([
    database
      .select()
      .from(eventsTable)
      .where(
        and(
          // older proposals might have a ProposalVoted event
          inArray(eventsTable.eventName, ['ProposalVotedV2', 'ProposalVoted']),
          eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id),
        ),
      )
      .orderBy(desc(eventsTable.blockNumber))
      .limit(1)
      .then((x) => x[0]),
    database
      .select()
      .from(eventsTable)
      .where(
        and(
          inArray(eventsTable.eventName, ['ProposalApproved']),
          eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id),
        ),
      )
      .orderBy(desc(eventsTable.blockNumber))
      .limit(1)
      .then((x) => x[0]),
  ]);

  const mostRecentBlockNumber =
    approvedEvent?.blockNumber && approvedEvent?.blockNumber > lastVoteEvent.blockNumber
      ? approvedEvent?.blockNumber
      : lastVoteEvent.blockNumber;
  const state = await getProposalOnChain(client, proposal.id, mostRecentBlockNumber);

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
        mostRecentBlockNumber,
      ),
    ),
  ]);

  const participationParameters = parseParticipationParameters(rawParticipationParameters);
  const quorumVotesRequired = calculateQuorum({
    participationParameters,
    thresholds,
    networkWeight: state[5] || proposal.networkWeight!,
  });

  return {
    quorumVotesRequired,
    participationParameters,
    thresholds,
    networkWeight: state[5] || proposal.networkWeight!,
  };
}
