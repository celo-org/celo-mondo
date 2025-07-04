import { governanceABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import CachedMetadata from 'src/config/proposals.json';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

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

  const proposalIdSql = sql`(${eventsTable.args}->>'proposalId')::bigint`;

  const groupedEvents = await database
    .select({
      proposalId: proposalIdSql.mapWith(BigInt),
      events: sql<(typeof eventsTable.$inferSelect)[]>`JSON_AGG(events)`,
    })
    .from(eventsTable)
    .where(
      sql`
        ${eventsTable.chainId} = ${client.chain.id}
        -- AND ${eventsTable.args}->>'proposalId' = '235'
        AND (
          ${eventsTable.eventName} = 'ProposalQueued'
          OR ${eventsTable.eventName} = 'ProposalDequeued'
          OR ${eventsTable.eventName} = 'ProposalApproved'
          OR ${eventsTable.eventName} = 'ProposalExecuted'
          OR ${eventsTable.eventName} = 'ProposalExpired'
        )`,
    )
    .groupBy(proposalIdSql)
    .orderBy(proposalIdSql);

  const cached = CachedMetadata as ProposalMetadata[];
  const proposalsMetadata = await fetchProposalsFromRepo(cached, false);
  const properties = await client.multicall({
    allowFailure: false,
    contracts: groupedEvents.map(
      (p) =>
        ({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getProposal',
          args: [p.proposalId],
        }) as const,
    ),
  });

  for (let i = 0; i < groupedEvents.length; i++) {
    const { proposalId, events } = groupedEvents[i];
    events.sort((a, b) => Number(a.blockNumber - b.blockNumber));

    let stage: ProposalStage;
    switch (events.at(-1)?.eventName) {
      case 'ProposalExecuted':
        stage = ProposalStage.Executed;
        break;

      case 'ProposalApproved':
        stage = ProposalStage.Execution;
        break;

      case 'ProposalExpired':
        stage = ProposalStage.Expiration;
        break;

      case 'ProposalDequeued':
        stage = ProposalStage.Referendum;
        break;

      case 'ProposalQueued':
        stage = ProposalStage.Queued;
        break;

      default:
        throw new Error('Unknown event: ' + events.at(-1)?.eventName);
    }

    const [proposer, deposit, timestampSec, numTransactions, url, networkWeight, isApproved] =
      properties[i];

    const cgpMatch = url.match(/cgp-(\d+)\.md/);

    const metadata = proposalsMetadata.find(
      ({ id, cgp }) =>
        BigInt(id || -1) === proposalId || cgp === parseInt(cgpMatch?.[1] || '0', 10),
    );

    if (!metadata) {
      console.log('-metadata not found for', { proposalId, cgp: cgpMatch?.[1] });
      continue;
    }
    await database.insert(proposalsTable).values({
      id: proposalId,
      chainId: client.chain.id,
      createdAt: parseInt((events.at(0)!.args as any).timestamp as string, 10),
      cgp: BigInt(metadata.cgp),
      author: metadata.author,
      url: metadata.url!,
      cgpUrl: metadata.cgpUrl,
      cgpUrlRaw: metadata.cgpUrlRaw,
      stage,
      title: metadata.title,
    });
  }

  process.exit(0);
}

main();
