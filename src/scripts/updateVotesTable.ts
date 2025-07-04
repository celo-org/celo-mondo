import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable, votesTable } from 'src/db/schema';
import { decodeVoteEventLog } from 'src/features/governance/hooks/useProposalVoters';
import { OrderedVoteValue, VoteType } from 'src/features/governance/types';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

function VoteTypeDecoder(voteTypeStr: string) {
  return OrderedVoteValue[parseInt(voteTypeStr, 10)];
}

async function main() {
  let fromBlock: bigint | undefined;

  if (process.env.RESUME_FROM_BLOCK) {
    fromBlock = BigInt(process.env.RESUME_FROM_BLOCK);
  }
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  const proposals = await database.select().from(proposalsTable);

  for (const proposal of proposals) {
    const allVoteEvents = await database.select().from(eventsTable).where(sql`
        ${eventsTable.chainId} = ${client.chain.id}
        AND (${eventsTable.args}->>'proposalId')::bigint = ${proposal.id}
        AND (
          ${eventsTable.eventName} = 'ProposalVoted'
          OR ${eventsTable.eventName} = 'ProposalVoteRevoked'
          OR ${eventsTable.eventName} = 'ProposalVotedV2'
          OR ${eventsTable.eventName} = 'ProposalVoteRevokedV2'
        )
      `);

    const votes = new Map<VoteType, bigint>([
      [VoteType.Abstain, 0n],
      [VoteType.None, 0n],
      [VoteType.No, 0n],
      [VoteType.Yes, 0n],
    ]);

    allVoteEvents.map(decodeVoteEventLog).forEach((event) => {
      if (!event) return;

      if (event.yesVotes >= 0n) {
        votes.set(VoteType.Yes, votes.get(VoteType.Yes)! + event.yesVotes);
      } else if (event.noVotes >= 0n) {
        votes.set(VoteType.No, votes.get(VoteType.No)! + event.noVotes);
      } else if (event.abstainVotes >= 0n) {
        votes.set(VoteType.Abstain, votes.get(VoteType.Abstain)! + event.abstainVotes);
      }
    });

    console.log('processed proposalId: ', proposal.id, votes);

    await database
      .insert(votesTable)
      .values(
        [...votes].map(([type, count]) => ({
          type,
          count,
          chainId: client.chain.id,
          proposalId: proposal.id,
        })),
      )
      .onConflictDoUpdate({
        set: { count: sql`excluded.count` },
        target: [votesTable.proposalId, votesTable.type, votesTable.chainId],
      });
  }

  process.exit(0);
}

main();
