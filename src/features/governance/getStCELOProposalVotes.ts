'use server';
import { and, desc, eq, sql } from 'drizzle-orm';
import database from 'src/config/database';
import VoteABI from 'src/config/stcelo/VoteABI';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { EmptyVoteAmounts, ProposalStage, VoteAmounts } from 'src/features/governance/types';
import { celoPublicClient } from 'src/utils/client';

interface VoteEventArgs {
  voter?: Address | undefined;
  proposalId?: bigint | undefined;
  yesVotes?: bigint | undefined;
  noVotes?: bigint | undefined;
  abstainVotes?: bigint | undefined;
}

function extractVote(args: VoteEventArgs): 'yesVotes' | 'noVotes' | 'abstainVotes' | undefined {
  return (['yesVotes', 'noVotes', 'abstainVotes'] as const).find((key) => args[key] !== 0n);
}

export async function getStCeloProposalVotes(
  chainId: number,
  proposalId: number,
  account: Address,
): Promise<VoteAmounts> {
  const [proposal] = await database
    .select()
    .from(proposalsTable)
    .where(and(eq(proposalsTable.chainId, chainId), eq(proposalsTable.id, proposalId)))
    .limit(1);

  if (!proposal) {
    throw new Error('proposal not found with id ' + proposalId);
  }

  const [[creationEvent], [lastEvent]] = await Promise.all([
    database
      .select()
      .from(eventsTable)
      .where(
        and(
          eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id),
          eq(eventsTable.eventName, 'ProposalQueued'),
        ),
      )
      .limit(1),
    database
      .select()
      .from(eventsTable)
      .where(and(eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id)))
      .orderBy(desc(eventsTable.blockNumber))
      .limit(1),
  ]);

  if (!creationEvent) {
    throw new Error('ProposalQueued event not found for proposal with id ' + proposalId);
  }

  const voteEvents = await celoPublicClient.getLogs({
    address: VoteABI.address,
    event: {
      type: 'event',
      name: 'ProposalVoted',
      inputs: [
        { type: 'address', name: 'voter', indexed: true },
        { type: 'uint256', name: 'proposalId', indexed: true },
        { type: 'uint256', name: 'yesVotes' },
        { type: 'uint256', name: 'noVotes' },
        { type: 'uint256', name: 'abstainVotes' },
      ],
    },
    args: {
      voter: account,
      proposalId: BigInt(proposalId),
    },
    fromBlock: creationEvent.blockNumber,
    toBlock: proposal.stage <= ProposalStage.Expiration ? 'latest' : lastEvent.blockNumber,
  });

  const voteStruct = {
    ...EmptyVoteAmounts,
  };

  // Sort descending to get the latest event first
  const sortedEvents = voteEvents.sort((a, b) => Number(b.blockNumber! - a.blockNumber!));
  for (const { args: values } of sortedEvents) {
    if (!values || !values.proposalId) continue;

    const vote = extractVote(values);
    if (!vote) return voteStruct;

    const key = vote.replace('Votes', '') as 'yes' | 'no' | 'abstain';
    voteStruct[key] = BigInt(values[vote as keyof typeof values] as string);

    break;
  }

  return voteStruct;
}
