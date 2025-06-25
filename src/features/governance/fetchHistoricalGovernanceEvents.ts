/* eslint no-console: 0 */

import { governanceABI } from '@celo/abis';
import { resolveAddress } from '@celo/actions';
import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { blocksProcessedTable, eventsTable } from 'src/db/schema';
import {
  Chain,
  GetContractEventsParameters,
  HttpRequestError,
  PublicClient,
  RpcRequestError,
  TimeoutError,
  Transport,
} from 'viem';

import '../../vendor/polyfill.js';

const default_step = 100_000n;

const bigintMath = {
  min: (...args: bigint[]) => args.reduce((min_, x) => (x < min_ ? x : min_)),
  max: (...args: bigint[]) => args.reduce((max_, x) => (x > max_ ? x : max_)),
};

export default async function fetchHistoricalEvents(
  eventName: GetContractEventsParameters<typeof governanceABI>['eventName'],
  client: PublicClient<Transport, Chain>,
  fromBlock?: bigint,
) {
  const latestBlock = await client.getBlockNumber();

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
    try {
      // Fetch events from `fromBlock` to `fromBlock+step`
      const events = await client.getContractEvents({
        ...query,
        fromBlock,
        toBlock: fromBlock + step,
      });

      // If there was any events, save them in the db
      if (events.length) {
        const { count } = await database
          .insert(eventsTable)
          // @ts-expect-error
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
          throw new Error('Retried too many times now...');
        }

        console.log(`Halved the block step down to ${step}`);
        continue;
      }
      throw e;
    }

    console.log(`Saving last processed block for ${eventName}: ${latestBlock}`);
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
}
