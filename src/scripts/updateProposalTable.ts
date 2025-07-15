import { governanceABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import CachedMetadata from 'src/config/proposals.json';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';
import { Chain, createPublicClient, http, parseEventLogs, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function main() {
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
      proposalId: proposalIdSql.mapWith(Number),
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

  const blockChainStages = await client.multicall({
    allowFailure: false,
    contracts: groupedEvents.map(
      (p) =>
        ({
          address: Addresses.Governance,
          abi: governanceABI,
          functionName: 'getProposalStage',
          args: [BigInt(p.proposalId)],
        }) as const,
    ),
  });

  const rowsToInsert = [] as (typeof proposalsTable.$inferInsert)[];
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

    // NOTE: it actually is the case `ProposalExpired` never gets called
    // according to Martin Volpe
    // >> nicolas: is it possible the ProposalExpired never gets emitted?
    // >> martin: probably because nobody takes the time to execute a expired proposal
    // >>         or the tx reverts, so it can’t even be emitted
    if (blockChainStages[i] === ProposalStage.Expiration && stage !== ProposalStage.Executed) {
      stage = ProposalStage.Expiration;
    }

    const urlIndex = 4;
    let url = properties[i][urlIndex];

    let cgpMatch = url.match(/cgp-(\d+)\.md/i);

    let metadata = proposalsMetadata.find(
      ({ id, cgp }) => (id || -1) === proposalId || cgp === parseInt(cgpMatch?.[1] || '0', 10),
    );

    // TODO: add this to the webhook
    if (!metadata) {
      console.log('metadata not found, trying to query old block', { proposalId });
      // NOTE: if `url` is empty, it means it's not available on the blockchain
      // anymore, so we query it at a block when it was still there
      if (!url) {
        url = (
          await client
            .readContract({
              blockNumber: BigInt(events.at(0)!.blockNumber!) + 1n,
              abi: governanceABI,
              address: Addresses.Governance,
              functionName: 'getProposal',
              args: [BigInt(proposalId)],
            })
            .catch((err) => {
              // NOTE: this can throw for really old proposals
              // not much to do honestly.
              let url = '';
              try {
                const match = (err.shortMessage as string).match(
                  /Bytes value "([\d,]+)" is not a valid boolean./i,
                );
                url = Buffer.from(
                  match![1]
                    .split(',')
                    .map((x) => parseInt(x, 10).toString(16))
                    .join(''),
                  'hex',
                ).toString();
              } catch (e) {
                // noop whatever
              }
              return ['', '', '', '', url];
            })
        )[urlIndex];

        cgpMatch = url.match(/cgp-(\d+)\.md/i);
        metadata = proposalsMetadata.find(({ cgp }) => cgp === parseInt(cgpMatch?.[1] || '0', 10));

        if (metadata) {
          console.log('+metadata found in older block', { proposalId, cgp: cgpMatch?.[1] });
        }
      }
    }

    if (proposalId === 131) {
      console.log(events, url);
    }

    if (!metadata) {
      console.log('-metadata not found for', { proposalId });
      continue;
    }

    const proposalEventQueuedArgs = events.at(0)!.args as Awaited<
      ReturnType<typeof parseEventLogs<typeof governanceABI, true, 'ProposalQueued'>>
    >[number]['args'];

    rowsToInsert.push({
      id: proposalId,
      chainId: client.chain.id,
      timestamp: parseInt(proposalEventQueuedArgs.timestamp.toString(), 10),
      cgp: metadata!.cgp,
      author: metadata!.author,
      url: metadata!.url,
      cgpUrl: metadata?.cgpUrl,
      cgpUrlRaw: metadata?.cgpUrlRaw,
      stage,
      title: metadata!.title,
      proposer: proposalEventQueuedArgs.proposer,
      deposit: BigInt(proposalEventQueuedArgs.deposit),
      executedAt: metadata?.timestampExecuted ? metadata.timestampExecuted / 1000 : null,
      transactionCount: parseInt(proposalEventQueuedArgs.transactionCount.toString(), 10),
    });

    if (proposalId === 131) {
      console.log(events, rowsToInsert.at(-1));
    }
  }

  const { count } = await database
    .insert(proposalsTable)
    .values(rowsToInsert)
    .onConflictDoUpdate({
      set: {
        cgp: sql`excluded."cgp"`,
        author: sql`excluded."author"`,
        url: sql`excluded."url"`,
        cgpUrl: sql`excluded."cgpUrl"`,
        cgpUrlRaw: sql`excluded."cgpUrlRaw"`,
        stage: sql`excluded."stage"`,
        title: sql`excluded."title"`,
        proposer: sql`excluded."proposer"`,
        deposit: sql`excluded."deposit"`,
        executedAt: sql`excluded."executedAt"`,
        transactionCount: sql`excluded."transactionCount"`,
      },
      target: [proposalsTable.chainId, proposalsTable.id],
    });

  console.log(`Upserted ${count} proposals`);

  const allProposals = await database
    .select({
      ids: sql<number[]>`JSON_AGG(${proposalsTable.id} ORDER BY ${proposalsTable.id})`,
    })
    .from(proposalsTable)
    .groupBy(proposalsTable.cgp);

  for (const { ids } of allProposals) {
    if (ids.length < 2) {
      continue;
    }
    while (ids.length > 1) {
      const [pastId] = ids.splice(0, 1);
      console.log(`UPDATE proposals SET pastId = ${pastId} WHERE id = ${ids.at(0)}`);
      await database
        .update(proposalsTable)
        .set({ pastId })
        .where(sql`${proposalsTable.id} = ${ids.at(0)}`);
    }
  }

  process.exit(0);
}

main();
