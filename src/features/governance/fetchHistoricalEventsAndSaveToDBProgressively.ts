/* eslint no-console: 0 */

import { governanceABI } from '@celo/abis';
import { resolveAddress } from '@celo/actions';
import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { blocksProcessedTable, eventsTable } from 'src/db/schema';
import { assertEvent } from 'src/features/governance/utils/votes';
import {
  Chain,
  HttpRequestError,
  PublicClient,
  RpcRequestError,
  TimeoutError,
  Transport,
} from 'viem';
import '../../vendor/polyfill';

const default_step = 100_000n;

const bigintMath = {
  min: (...args: bigint[]) => args.reduce((min_, x) => (x < min_ ? x : min_)),
  max: (...args: bigint[]) => args.reduce((max_, x) => (x > max_ ? x : max_)),
};

const VALID_EVENTS = [
  'ProposalQueued',
  'ProposalDequeued',
  'ProposalApproved',
  'ProposalExecuted',
  'ProposalVoted',
  'ProposalVoteRevoked',
  'ProposalVotedV2',
  'ProposalVoteRevokedV2',
  'ProposalUpvoted',
  'ProposalUpvoteRevoked',
  'ProposalExpired',
] as const;

export default async function fetchHistoricalEventsAndSaveToDBProgressively(
  eventName: string,
  client: PublicClient<Transport, Chain>,
  fromBlock?: bigint,
): Promise<bigint[]> {
  if (!assertEvent(VALID_EVENTS, eventName)) {
    console.info('Not a valid event', eventName);
    return [];
  }
  const latestBlock = await client.getBlockNumber();
  const proposalIds: bigint[] = [];

  if (!fromBlock) {
    const [lastBlock] = await database
      .select()
      .from(blocksProcessedTable)
      .where(
        sql`
        ${blocksProcessedTable.chainId} = ${client.chain.id} 
        AND ${blocksProcessedTable.eventName} = ${eventName}
      `,
      )
      .limit(1);

    fromBlock = lastBlock?.blockNumber || 0n;
  }

  console.log('------');
  if (fromBlock > 0n) {
    console.log(`Resuming ${eventName} from block ${fromBlock}... until ${latestBlock}`);
  }

  const query = {
    abi: governanceABI,
    eventName,
    // @ts-expect-error - not sure why client isn't happy honestly
    address: await resolveAddress(client, 'Governance'),
  } as const;

  let step = default_step;
  while (fromBlock < latestBlock) {
    const toBlock = fromBlock + step >= latestBlock ? 'latest' : fromBlock + step;
    try {
      // Fetch events from `fromBlock` to `fromBlock+step`
      const events = await client.getContractEvents({
        ...query,
        fromBlock,
        toBlock: toBlock,
      });

      // If there was any events, save them in the db
      if (events.length) {
        proposalIds.push(
          ...events.map((x) => x.args.proposalId).filter((x) => typeof x === 'bigint'),
        );
        const { count } = await database
          .insert(eventsTable)
          .values(events.map((event) => ({ ...event, chainId: client.chain.id })))
          .onConflictDoNothing();
        console.log({ inserts: count });
      }
    } catch (e) {
      // If there's any network issue, retry
      if (
        e instanceof TimeoutError ||
        e instanceof HttpRequestError ||
        e instanceof RpcRequestError
      ) {
        step /= 2n;
        if (step <= 1_000) {
          console.log(e);
          throw new Error('Retried too many times now...');
        }

        console.log(`Halved the block step down to ${step}`);
        // Continue the loop without incrementing fromBlock nor saving progress to DB
        continue;
      }
      throw e;
    }

    console.log(
      `Saving last processed block for ${eventName}: ${toBlock === 'latest' ? latestBlock : toBlock}`,
    );
    await database
      .insert(blocksProcessedTable)
      .values({
        // fromBlock+step can def overshoot the latestBlock, so we make sure not to overshoot
        // but also we wanna save processed blocks incrementally
        blockNumber: bigintMath.min(fromBlock + step, latestBlock),
        eventName: eventName as string,
        chainId: client.chain.id,
      })
      .onConflictDoUpdate({
        set: { blockNumber: latestBlock },
        target: [blocksProcessedTable.eventName, blocksProcessedTable.chainId],
      });

    // increment the fromBlock to fetch more recent events
    fromBlock += step;
  }

  return proposalIds;
}
