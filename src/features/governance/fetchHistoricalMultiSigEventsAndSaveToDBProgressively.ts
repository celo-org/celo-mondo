/* eslint no-console: 0 */

import { governanceABI, multiSigABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { blocksProcessedTable, eventsTable } from 'src/db/schema';
import { assertEvent } from 'src/features/governance/utils/votes';
import { sleep } from 'src/utils/async';
import {
  Address,
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

const VALID_MULTISIG_EVENTS = ['Confirmation', 'Revocation', 'Execution'] as const;

/**
 * Fetches historical MultiSig events (Confirmation, Revocation, Execution) and saves them to the database.
 * Similar to fetchHistoricalEventsAndSaveToDBProgressively but for MultiSig contract events.
 */
export default async function fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
  eventName: string,
  client: PublicClient<Transport, Chain>,
  fromBlock?: bigint,
  untilBlock?: bigint,
): Promise<bigint[]> {
  if (!assertEvent(VALID_MULTISIG_EVENTS, eventName)) {
    console.info('Not a valid MultiSig event', eventName);
    return [];
  }

  // Get the approver multisig address from the Governance contract
  const approverMultisigAddress = await client.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
  });

  console.info(`Fetching ${eventName} events from MultiSig: ${approverMultisigAddress}`);

  const latestBlock = untilBlock || (await client.getBlockNumber());
  const transactionIds: bigint[] = [];

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
    abi: multiSigABI,
    eventName,
    address: approverMultisigAddress as Address,
  } as const;

  let step = default_step;
  let toBlock: bigint | 'latest';
  while (fromBlock < latestBlock) {
    toBlock = fromBlock + step >= latestBlock ? 'latest' : fromBlock + step;
    try {
      // Fetch events from `fromBlock` to `fromBlock+step`
      const events = await client.getContractEvents({
        ...query,
        fromBlock,
        toBlock: toBlock,
      });

      // If there were any events, save them in the db
      if (events.length) {
        transactionIds.push(
          ...events.map((x) => (x.args as any).transactionId).filter((x) => typeof x === 'bigint'),
        );
        const { count } = await database
          .insert(eventsTable)
          .values(events.map((event) => ({ ...event, chainId: client.chain.id })))
          .onConflictDoNothing();
        console.log({ inserts: count });
      }
      await sleep(1000);
    } catch (e) {
      // If there's any network issue, retry with smaller step
      if (
        e instanceof TimeoutError ||
        e instanceof HttpRequestError ||
        e instanceof RpcRequestError
      ) {
        step /= 3n;
        if (step <= 1_000) {
          console.log(e);
          throw new Error('Retried too many times now...');
        }
        console.info('waiting to avoid rate limte');
        await sleep(3000);
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
        blockNumber: bigintMath.min(fromBlock + step, toBlock === 'latest' ? latestBlock : toBlock),
        eventName: eventName as string,
        chainId: client.chain.id,
      })
      .onConflictDoUpdate({
        set: { blockNumber: toBlock === 'latest' ? latestBlock : toBlock },
        target: [blocksProcessedTable.eventName, blocksProcessedTable.chainId],
      });

    // increment the fromBlock to fetch more recent events
    fromBlock += step;
  }

  return transactionIds;
}
