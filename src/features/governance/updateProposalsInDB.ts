/* eslint no-console: 0 */

import { governanceABI } from '@celo/abis';
import { and, eq, inArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { Address, Chain, PublicClient, ReadContractErrorType, Transport } from 'viem';

import { Addresses } from 'src/config/contracts';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';

import '../../vendor/polyfill.js';

// Note: for some reason when using SQL's `JSON_AGG` function, we're losing the bigint types
type Event = typeof eventsTable.$inferSelect;
interface JsonAggEvent extends Omit<Event, 'blockNumber'> {
  blockNumber: number;
}

export default async function updateProposalsInDB(
  client: PublicClient<Transport, Chain>,
  proposalIds?: bigint[],
  intent: 'update' | 'replay' = 'update',
): Promise<void> {
  const proposalIdSql = sql`(${eventsTable.args}->>'proposalId')::bigint`;

  const conditions = [
    eq(eventsTable.chainId, client.chain.id),
    inArray(eventsTable.eventName, [
      'ProposalQueued',
      'ProposalDequeued',
      'ProposalApproved',
      'ProposalExecuted',
      'ProposalExpired',
    ]),
  ];

  if (proposalIds && proposalIds.length) {
    conditions.push(inArray(proposalIdSql, proposalIds));
  }

  const groupedEvents = await database
    .select({
      proposalId: proposalIdSql.mapWith(Number),
      events: sql<JsonAggEvent[]>`JSON_AGG(events ORDER BY ${eventsTable.blockNumber} ASC)`,
    })
    .from(eventsTable)
    .where(and(...conditions))
    .groupBy(proposalIdSql)
    .orderBy(proposalIdSql);

  const cached = (await import('src/config/proposals.json')).default as ProposalMetadata[];
  const proposalsMetadata = await fetchProposalsFromRepo(cached, false);

  const rowsToInsert = [] as (typeof proposalsTable.$inferInsert)[];
  for (let i = 0; i < groupedEvents.length; i++) {
    const { proposalId, events } = groupedEvents[i];
    const proposal = await mergeProposalDataIntoPGRow({
      client,
      proposalId,
      events,
      proposalsMetadata,
    });

    if (proposal) {
      rowsToInsert.push(proposal);
    }
  }

  const { count } = await database
    .insert(proposalsTable)
    .values(rowsToInsert)
    .onConflictDoUpdate({
      set:
        intent === 'replay'
          ? {
              cgp: sql`excluded."cgp"`,
              author: sql`excluded."author"`,
              url: sql`excluded."url"`,
              cgpUrl: sql`excluded."cgpUrl"`,
              cgpUrlRaw: sql`excluded."cgpUrlRaw"`,
              stage: sql`excluded."stage"`,
              title: sql`excluded."title"`,
              proposer: sql`excluded."proposer"`,
              deposit: sql`excluded."deposit"`,
              networkWeight: sql`excluded."networkWeight"`,
              executedAt: sql`excluded."executedAt"`,
              transactionCount: sql`excluded."transactionCount"`,
            }
          : {
              stage: sql`excluded."stage"`,
              networkWeight: sql`excluded."networkWeight"`,
            },
      target: [proposalsTable.chainId, proposalsTable.id],
    });

  console.info(`Upserted ${count} proposals`);

  await relinkProposals();
}

async function mergeProposalDataIntoPGRow({
  client,
  proposalId,
  events,
  proposalsMetadata,
}: {
  client: PublicClient<Transport, Chain>;
  proposalId: number;
  events: JsonAggEvent[];
  proposalsMetadata: ProposalMetadata[];
}): Promise<typeof proposalsTable.$inferInsert | null> {
  const proposalQueuedEvent = events[0]! as (typeof events)[number] & {
    args: {
      transactionCount: string;
      timestamp: string;
      proposer: Address;
      deposit: string;
    };
  };
  const lastProposalEvent = events.at(-1)!;

  const proposalOnChainAtCreation = await getProposalOnChain(
    client,
    proposalId,
    BigInt(proposalQueuedEvent.blockNumber),
  );
  const proposalOnChainAtEvent = await getProposalOnChain(
    client,
    proposalId,
    BigInt(lastProposalEvent.blockNumber),
  );

  const stage = await getProposalStage(client, proposalId, lastProposalEvent.eventName);

  const urlIndex = 4;
  let url = proposalOnChainAtEvent[urlIndex];
  let cgpMatch = url.match(/cgp-(\d+)\.md/i);
  let metadata = proposalsMetadata.find(
    ({ id, cgp }) => (id || -1) === proposalId || cgp === parseInt(cgpMatch?.[1] || '0', 10),
  );

  if (!metadata) {
    console.info(
      'metadata not found, trying to find a url in oldest possible block for ',
      proposalId,
    );
    // NOTE: if `url` is empty, it means it's not available on the blockchain
    // anymore, so we query it at a block when it was still there
    if (!url) {
      url = proposalOnChainAtCreation[urlIndex];
      cgpMatch = url.match(/cgp-(\d+)\.md/i);
      metadata = proposalsMetadata.find(({ cgp }) => cgp === parseInt(cgpMatch?.[1] || '0', 10));
      if (metadata) {
        console.info('+metadata found in older block', { proposalId, cgp: cgpMatch?.[1] });
      }
    }
  }

  if (!metadata) {
    console.info('metadata not found for', proposalId, ', not inserting a row ⚠️');
    return null;
  }

  // NOTE: use last block where the proposal was still on chain to know about network weight
  const networkWeightIndex = 5;
  const networkWeight =
    proposalOnChainAtEvent[networkWeightIndex] ||
    (await client
      .readContract({
        blockNumber: BigInt(lastProposalEvent.blockNumber!) - 1n,
        abi: governanceABI,
        address: Addresses.Governance,
        functionName: 'getProposal',
        args: [BigInt(proposalId)],
      })
      .then((x) => x[networkWeightIndex])
      .catch((_) => 0n));

  // NOTE: use earliest possible block where the proposal was on chain to know about numTransactions
  // however they can be not present for really old blocks so infer from the event which can also be
  // missing them
  const numTransactionsIndex = 3;
  const numTransactions =
    proposalOnChainAtCreation[numTransactionsIndex] ||
    BigInt(proposalQueuedEvent.args.transactionCount) ||
    0n;

  return {
    id: proposalId,
    chainId: client.chain.id,
    timestamp: parseInt(proposalQueuedEvent.args.timestamp, 10),
    cgp: metadata!.cgp,
    author: metadata!.author,
    url: metadata!.url,
    cgpUrl: metadata?.cgpUrl,
    cgpUrlRaw: metadata?.cgpUrlRaw,
    stage,
    title: metadata!.title,
    proposer: proposalQueuedEvent.args.proposer,
    deposit: BigInt(proposalQueuedEvent.args.deposit),
    networkWeight,
    executedAt: metadata?.timestampExecuted ? metadata.timestampExecuted / 1000 : null,
    transactionCount: Number(numTransactions),
  };
}

async function getProposalOnChain(
  client: PublicClient<Transport, Chain>,
  proposalId: number,
  blockNumber: bigint,
): Promise<
  readonly [
    proposer: `0x${string}`,
    deposit: bigint,
    timestamp: bigint,
    transactionCount: bigint,
    descriptionUrl: string,
    networkWeight: bigint,
    approved: boolean,
  ]
> {
  try {
    return await client.readContract({
      blockNumber,
      abi: governanceABI,
      address: Addresses.Governance,
      functionName: 'getProposal',
      args: [BigInt(proposalId)],
    });
  } catch (err) {
    // NOTE: this can throw for really old proposals
    // not much to do honestly.
    let url = '';
    try {
      const match = (err as ReadContractErrorType).shortMessage.match(
        /Bytes value "([\d,]+)" is not a valid boolean./i,
      );
      const hexUrl = match
        ?.at(1)
        ?.split(',')
        ?.map((x) => parseInt(x, 10).toString(16))
        .join('');
      url = hexUrl ? Buffer.from(hexUrl, 'hex').toString() : url;
    } catch (e) {
      // noop whatever
    }

    return ['0x0', 0n, 0n, 0n, url, 0n, false];
  }
}

async function getProposalStage(
  client: PublicClient<Transport, Chain>,
  proposalId: number,
  eventName: string | undefined,
): Promise<ProposalStage> {
  let stage: ProposalStage;
  switch (eventName) {
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
      throw new Error('Unknown event: ' + eventName);
  }

  // NOTE: it actually is the case `ProposalExpired` never gets called
  // according to Martin Volpe
  // >> nicolas: is it possible the ProposalExpired never gets emitted?
  // >> martin: probably because nobody takes the time to execute a expired proposal
  // >>         or the tx reverts, so it can’t even be emitted
  if (stage !== ProposalStage.Executed) {
    const stageOnChain = await client.readContract({
      abi: governanceABI,
      address: Addresses.Governance,
      functionName: 'getProposalStage',
      args: [BigInt(proposalId)],
    });
    if (stageOnChain > stage) {
      stage = stageOnChain;
    }
  }
  return stage;
}

async function relinkProposals() {
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
    // chain update the proposals to link to each other
    while (ids.length > 1) {
      const [pastId] = ids.splice(0, 1);
      console.info(`UPDATE proposals SET pastId = ${pastId} WHERE id = ${ids[0]}`);
      await database
        .update(proposalsTable)
        .set({ pastId })
        .where(sql`${proposalsTable.id} = ${ids[0]}`);
    }
  }
}
