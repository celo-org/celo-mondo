/* eslint no-console: 0 */

import { governanceABI } from '@celo/abis';
import { resolveAddress } from '@celo/actions';
import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { blocksProcessedTable, eventsTable } from 'src/db/schema';
import { Chain, GetContractEventsParameters, PublicClient, Transport } from 'viem';

import '../../vendor/polyfill.js';

const default_step = 100_000n;
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
  try {
    while (fromBlock < latestBlock) {
      try {
        const events = await client.getContractEvents({
          ...query,
          fromBlock,
          toBlock: fromBlock + step,
        });

        console.log(fromBlock);
        if (events.length) {
          const { count } = await database
            .insert(eventsTable)
            // @ts-expect-error
            .values(events.map((event) => ({ ...event, chainId: client.chain.id })))
            .onConflictDoNothing();
          console.log({ inserts: count });
        }

        fromBlock += step;
      } catch (e) {
        step /= 2n;
        if (step <= 1_000) {
          throw new Error('Retried too many times now...');
        } else {
          console.log(`Halved the block step down to ${step}`);
        }
      }
    }
  } finally {
    console.log(`Saving last processed block for ${eventName}: ${latestBlock}`);
    await database
      .insert(blocksProcessedTable)
      .values({
        blockNumber: latestBlock,
        eventName: eventName as string,
        chainId: client.chain.id,
      })
      .onConflictDoUpdate({
        set: { blockNumber: latestBlock },
        target: [blocksProcessedTable.eventName, blocksProcessedTable.chainId],
      });
  }
}
