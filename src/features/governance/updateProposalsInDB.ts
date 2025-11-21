/* eslint no-console: 0 */

import { governanceABI, lockedGoldABI } from '@celo/abis';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { Address, Chain, PublicClient, ReadContractErrorType, Transport } from 'viem';

import { Addresses } from 'src/config/contracts';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';

import { revalidateTag } from 'next/cache';
import { CacheKeys } from 'src/config/consts';
import '../../vendor/polyfill';

// Note: for some reason when using SQL's `JSON_AGG` function, we're losing the bigint types
type Event = typeof eventsTable.$inferSelect;
interface JsonAggEvent extends Omit<Event, 'blockNumber'> {
  blockNumber: number;
}

const TIMESTAMP_INDEX = 2;
const NUM_TRANSACTION_INDEX = 3;
const URL_INDEX = 4;

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
              // NOTE: make sure all values are here
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
              transactionCount: sql`excluded."transactionCount"`,
              timestamp: sql`excluded."timestamp"`,
              queuedAt: sql`excluded."queuedAt"`,
              queuedAtBlockNumber: sql`excluded."queuedAtBlockNumber"`,
              dequeuedAt: sql`excluded."dequeuedAt"`,
              dequeuedAtBlockNumber: sql`excluded."dequeuedAtBlockNumber"`,
              approvedAt: sql`excluded."approvedAt"`,
              approvedAtBlockNumber: sql`excluded."approvedAtBlockNumber"`,
              executedAt: sql`excluded."executedAt"`,
              executedAtBlockNumber: sql`excluded."executedAtBlockNumber"`,
            }
          : {
              stage: sql`excluded."stage"`,
              networkWeight: sql`excluded."networkWeight"`,
              timestamp: sql`excluded."timestamp"`,
              queuedAt: sql`excluded."queuedAt"`,
              queuedAtBlockNumber: sql`excluded."queuedAtBlockNumber"`,
              dequeuedAt: sql`excluded."dequeuedAt"`,
              dequeuedAtBlockNumber: sql`excluded."dequeuedAtBlockNumber"`,
              approvedAt: sql`excluded."approvedAt"`,
              approvedAtBlockNumber: sql`excluded."approvedAtBlockNumber"`,
              executedAt: sql`excluded."executedAt"`,
              executedAtBlockNumber: sql`excluded."executedAtBlockNumber"`,
            },
      target: [proposalsTable.chainId, proposalsTable.id],
    });

  console.info(`Upserted ${count} proposals`);

  await relinkProposals();

  if (process.env.CI === 'true') {
    const BASE_URL = process.env.IS_PRODUCTION_DATABASE
      ? 'https://mondo.celo.org'
      : 'https://preview-celo-mondo.vercel.app';
    await fetch(`${BASE_URL}/api/governance/proposals`, { method: 'DELETE' });
  } else if (process.env.NEXT_RUNTIME) {
    // Only revalidate if running in a Next.js runtime
    revalidateTag(CacheKeys.AllProposals);
  }
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
  let mostRecentProposalBlockNumber = BigInt(lastProposalEvent.blockNumber);

  const proposalOnChainAtCreation = await getProposalOnChain(
    client,
    proposalId,
    BigInt(proposalQueuedEvent.blockNumber),
  );
  let mostRecentProposalState = await getProposalOnChain(client, proposalId);
  if (BigInt(mostRecentProposalState[0]) === 0n) {
    // note ProposalVoted and ProposalVotedV2 have different arg data https://github.com/celo-org/celo-monorepo/blob/0a5c8c500559c291d14af236a15e621f74053c50/packages/protocol/contracts/governance/Governance.sol#L154
    const lastVoteEvent = (
      await database
        .select()
        .from(eventsTable)
        .where(
          and(
            // older proposals might have a ProposalVoted event
            inArray(eventsTable.eventName, ['ProposalVotedV2', 'ProposalVoted']),
            eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposalId),
          ),
        )
        .orderBy(desc(eventsTable.blockNumber))
        .limit(1)
    )[0];

    // Determine the most recent block number to query
    if (lastProposalEvent.eventName === 'ProposalExecuted') {
      // use the block before the execution as the most recent proposal state as execution removes from chain
      mostRecentProposalBlockNumber = BigInt(lastProposalEvent.blockNumber - 1);
    } else if (
      // if proposal is voted on but never executed/expired then we will only have the latest vote event to find the proposal by
      lastVoteEvent?.blockNumber &&
      lastVoteEvent.blockNumber > BigInt(lastProposalEvent.blockNumber)
    ) {
      mostRecentProposalBlockNumber = lastVoteEvent.blockNumber;
    } else {
      mostRecentProposalBlockNumber = BigInt(lastProposalEvent.blockNumber);
    }

    // we can't rely on events as they don't all contain timestamps
    // Why we need timestamps from them? timestamp only changes when queing and dequeuing which do contain timestamps
    mostRecentProposalState = await getProposalOnChain(
      client,
      proposalId,
      mostRecentProposalBlockNumber,
    );
  }

  const stage = await getProposalStage(client, proposalId, lastProposalEvent.eventName);
  let column: 'queuedAt' | 'dequeuedAt' | 'approvedAt' | 'executedAt' | 'expiredAt';
  switch (lastProposalEvent.eventName) {
    case 'ProposalExecuted':
      column = 'executedAt';
      break;
    case 'ProposalApproved':
      column = 'approvedAt';
      break;
    case 'ProposalExpired':
      column = 'expiredAt';
      break;
    case 'ProposalDequeued':
      column = 'dequeuedAt';
      break;
    case 'ProposalQueued':
      column = 'queuedAt';
      break;
    default:
      throw new Error(`Unhandled event: ${lastProposalEvent.eventName}`);
  }

  let url = mostRecentProposalState[URL_INDEX];
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
      url = proposalOnChainAtCreation[URL_INDEX];
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
  let networkWeight = mostRecentProposalState[networkWeightIndex];
  if (networkWeight === 0n) {
    console.log(
      'network weight is 0, getting from locked celo amount at',
      mostRecentProposalBlockNumber,
    );
    networkWeight = await getNetworkWeightFromLockedCeloAmount(
      client,
      mostRecentProposalBlockNumber,
    );
  } else {
    console.log('network weight is not 0, using', networkWeight, 'at', mostRecentProposalState);
  }

  // NOTE: use earliest possible block where the proposal was on chain to know about numTransactions
  // however they can be not present for really old blocks so infer from the event which can also be
  // missing them
  const numTransactions =
    proposalOnChainAtCreation[NUM_TRANSACTION_INDEX] ||
    BigInt(proposalQueuedEvent.args.transactionCount) ||
    0n;

  const eventUnixTimestampInSeconds = (
    await client.getBlock({ blockNumber: BigInt(lastProposalEvent.blockNumber) })
  ).timestamp;

  const [existingProposal] = await database
    .select()
    .from(proposalsTable)
    .where(eq(proposalsTable.id, proposalId));

  return {
    // NOTE: we need to make sure the existing values (dequeuedAt, queuedAt, etc) are
    // present in the object to not override them with NULL values
    ...existingProposal,
    id: proposalId,
    chainId: client.chain.id,
    timestamp: parseInt(mostRecentProposalState[TIMESTAMP_INDEX].toString(), 10),
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
    transactionCount: Number(numTransactions),
    [column + 'BlockNumber']: lastProposalEvent.blockNumber,
    [column]: new Date(Number(eventUnixTimestampInSeconds) * 1000),
  };
}

export async function getProposalOnChain(
  client: PublicClient<Transport, Chain>,
  proposalId: number,
  blockNumber?: bigint,
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
  let stage: ProposalStage | undefined;
  switch (eventName) {
    case 'ProposalExecuted':
      stage = ProposalStage.Executed;
      break;

    case 'ProposalExpired':
      stage = ProposalStage.Expiration;
      break;

    // NOTE: approval doesn't change stage, it's a boolean state
    // but we still want to update the approvedAt column
    // in this case setting stage to undefined will force
    // the next if statement to fetch stage from the blockchain
    // as it could be 'referendum' or 'execution' but no event is emitted
    // for the transition from 'referendum' stage  to 'execution' stage
    case 'ProposalApproved':
      stage = undefined;
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
    if (!stage || stageOnChain > stage) {
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

async function getNetworkWeightFromLockedCeloAmount(
  client: PublicClient<Transport, Chain>,
  blockNumber: bigint,
): Promise<bigint> {
  try {
    const lockedCeloAmount = await client.readContract({
      blockNumber,
      abi: lockedGoldABI,
      address: Addresses.LockedGold,
      functionName: 'getTotalLockedGold',
      args: [],
    });
    return lockedCeloAmount;
  } catch (err) {
    console.error('Error getting network weight from locked celo amount at', blockNumber, err);
    return 0n;
  }
}
