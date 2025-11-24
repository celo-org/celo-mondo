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
  ResourceUnavailableRpcError,
  RpcRequestError,
  TimeoutError,
  Transport,
} from 'viem';
import '../../vendor/polyfill';

const default_step = 60_000n; // More conservative to reduce timeouts

const bigintMath = {
  min: (...args: bigint[]) => args.reduce((min_, x) => (x < min_ ? x : min_)),
  max: (...args: bigint[]) => args.reduce((max_, x) => (x > max_ ? x : max_)),
};

const VALID_MULTISIG_EVENTS = ['Confirmation', 'Revocation', 'Execution'] as const;

export interface FetchMultiSigEventsOptions {
  fromBlock?: bigint;
  untilBlock?: bigint;
  maxBlockRange?: bigint;
  targetConfirmations?: number;
  searchDirection?: 'forward' | 'backward';
  saveProgress?: boolean;
}

export interface FetchMultiSigEventsResult {
  transactionIds: bigint[];
  confirmationCount: number;
  lastEventBlock: bigint | null; // Block number of the last (highest) event found
}

/**
 * Fetches historical MultiSig events (Confirmation, Revocation, Execution) and saves them to the database.
 * Similar to fetchHistoricalEventsAndSaveToDBProgressively but for MultiSig contract events.
 *
 * @param maxBlockRange - Maximum number of blocks to search (default: unlimited)
 * @param targetConfirmations - Stop early when this many Confirmation events are found (default: unlimited)
 * @param searchDirection - 'forward' (increment blocks) or 'backward' (decrement blocks) (default: 'forward')
 * @param saveProgress - Whether to save progress to blocksProcessedTable (default: true for full backfills)
 */
export default async function fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
  eventName: string,
  client: PublicClient<Transport, Chain>,
  options: FetchMultiSigEventsOptions = {},
): Promise<FetchMultiSigEventsResult> {
  const {
    fromBlock: initialFromBlock,
    untilBlock: initialUntilBlock,
    maxBlockRange,
    targetConfirmations,
    searchDirection = 'forward',
    saveProgress = true,
  } = options;

  if (!assertEvent(VALID_MULTISIG_EVENTS, eventName)) {
    console.info('Not a valid MultiSig event', eventName);
    return { transactionIds: [], confirmationCount: 0, lastEventBlock: null };
  }

  // Get the approver multisig address from the Governance contract
  const approverMultisigAddress = await client.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
  });

  console.info(`Fetching ${eventName} events from MultiSig: ${approverMultisigAddress}`);
  if (searchDirection === 'backward') {
    console.info(`Searching backwards from block ${initialFromBlock}`);
  }

  const transactionIds: bigint[] = [];
  let confirmationCount = 0;
  let lastEventBlock: bigint | null = null;

  let fromBlock = initialFromBlock;
  if (!fromBlock && saveProgress) {
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
  if (!fromBlock) {
    fromBlock = 0n;
  }

  let untilBlock = initialUntilBlock || (await client.getBlockNumber());

  // Apply maxBlockRange if specified
  if (maxBlockRange) {
    if (searchDirection === 'forward') {
      untilBlock = bigintMath.min(untilBlock, fromBlock + maxBlockRange);
    } else {
      // For backward search, untilBlock becomes the lower bound
      untilBlock = bigintMath.max(0n, fromBlock - maxBlockRange);
    }
  }

  console.log('------');
  if (fromBlock > 0n) {
    console.log(
      `${searchDirection === 'backward' ? 'Searching backwards' : 'Resuming'} ${eventName} from block ${fromBlock}... until ${untilBlock}`,
    );
  }

  const query = {
    abi: multiSigABI,
    eventName,
    address: approverMultisigAddress as Address,
  } as const;

  let step = default_step;
  let toBlock: bigint;
  let wait = 1010;
  let retryCount = 0;
  const MAX_RETRIES = 10; // Prevent infinite retry loops
  const MAX_WAIT_TIME = 30_000; // Cap wait time at 30 seconds

  const shouldContinue = (fromBlockNumber: bigint) => {
    if (searchDirection === 'forward') {
      return fromBlockNumber < untilBlock;
    } else {
      return fromBlockNumber > untilBlock;
    }
  };

  while (shouldContinue(fromBlock)) {
    if (searchDirection === 'forward') {
      toBlock = fromBlock + step >= untilBlock ? untilBlock : fromBlock + step;
    } else {
      // Backward search: toBlock is lower, fromBlock is higher
      toBlock = fromBlock - step <= untilBlock ? untilBlock : fromBlock - step;
    }

    console.log(
      `🔍 Requesting blocks ${fromBlock} to ${toBlock} (step: ${step}, range: ${toBlock - fromBlock})`,
    );

    try {
      // Fetch events from the range
      const events = await client.getContractEvents({
        ...query,
        fromBlock: searchDirection === 'forward' ? fromBlock : toBlock,
        toBlock: searchDirection === 'forward' ? toBlock : fromBlock,
      });
      console.info('events found', events.length);

      // Reset retry counter and reduce wait time on successful request
      retryCount = 0;
      if (wait > 1010) {
        wait = Math.max(1010, Math.floor(wait / 2)); // Gradually decrease wait time
      }

      // If there were any events, save them in the db
      if (events.length) {
        transactionIds.push(
          ...events.map((x) => (x.args as any).transactionId).filter((x) => typeof x === 'bigint'),
        );

        // Track the highest block number seen
        for (const event of events) {
          if (lastEventBlock === null || event.blockNumber > lastEventBlock) {
            lastEventBlock = event.blockNumber;
          }
        }

        // Track confirmation count for early exit
        if (eventName === 'Confirmation') {
          confirmationCount += events.length;
          console.info(`Total confirmations found: ${confirmationCount}`);

          // Early exit if we've found enough confirmations
          if (targetConfirmations && confirmationCount >= targetConfirmations) {
            console.info(
              `✅ Found ${confirmationCount} confirmations (target: ${targetConfirmations}), stopping early`,
            );
            // Still save these events before exiting (with retry logic)
            let saved = false;
            let saveRetries = 3;
            while (!saved && saveRetries > 0) {
              try {
                await database
                  .insert(eventsTable)
                  .values(events.map((event) => ({ ...event, chainId: client.chain.id })))
                  .onConflictDoNothing();
                saved = true;
              } catch (dbError: any) {
                saveRetries--;
                if (
                  dbError.cause?.code === 'ECONNRESET' ||
                  dbError.cause?.code === 'ECONNREFUSED'
                ) {
                  console.warn(
                    `Database connection error on early exit save, retrying... (${saveRetries} attempts left)`,
                  );
                  await sleep(2000);
                  if (saveRetries === 0) {
                    throw dbError;
                  }
                } else {
                  throw dbError;
                }
              }
            }
            break;
          }
        }

        // Retry database insert on connection errors
        let inserted = false;
        let retries = 3;
        while (!inserted && retries > 0) {
          try {
            const { count } = await database
              .insert(eventsTable)
              .values(events.map((event) => ({ ...event, chainId: client.chain.id })))
              .onConflictDoNothing();
            console.log({ inserts: count });
            inserted = true;
          } catch (dbError: any) {
            retries--;
            if (dbError.cause?.code === 'ECONNRESET' || dbError.cause?.code === 'ECONNREFUSED') {
              console.warn(`Database connection error, retrying... (${retries} attempts left)`);
              await sleep(2000); // Wait 2 seconds before retry
              if (retries === 0) {
                throw dbError; // Re-throw if out of retries
              }
            } else {
              throw dbError; // Not a connection error, re-throw immediately
            }
          }
        }
      }
      await sleep(wait);
    } catch (e) {
      // If there's any network issue, retry with smaller step
      if (
        e instanceof TimeoutError ||
        e instanceof HttpRequestError ||
        e instanceof RpcRequestError ||
        e instanceof ResourceUnavailableRpcError
      ) {
        retryCount++;
        console.log(e);

        // Check if we've exceeded max retries
        if (retryCount >= MAX_RETRIES) {
          console.error(`Exceeded maximum retries (${MAX_RETRIES}). Last error:`);
          throw new Error(`Failed after ${MAX_RETRIES} retries. Step size reached: ${step}`);
        }

        // Check if step size is too small
        if (step <= 1_000n) {
          console.error('Step size too small (≤1000 blocks)');
          throw new Error(`Step size reduced to ${step} blocks, cannot continue`);
        }

        // Halve the step size for next attempt
        step /= 2n;

        // Apply exponential backoff with cap
        wait = Math.min(wait * 3, MAX_WAIT_TIME);
        console.info(`⏳ Waiting ${wait}ms to avoid rate limit...`);
        await sleep(wait);
        console.log(`🔄 Retry ${retryCount}/${MAX_RETRIES}: Halved block step to ${step}`);

        // Continue the loop without incrementing fromBlock nor saving progress to DB
        continue;
      }
      throw e;
    }

    if (saveProgress) {
      console.log(
        `Saving last processed block for ${eventName}: ${toBlock > untilBlock ? untilBlock : toBlock}`,
      );

      // Retry progress save on connection errors
      let progressSaved = false;
      let progressRetries = 3;
      while (!progressSaved && progressRetries > 0) {
        try {
          await database
            .insert(blocksProcessedTable)
            .values({
              // fromBlock+step can def overshoot the untilBlock, so we make sure not to overshoot
              // but also we wanna save processed blocks incrementally
              blockNumber: bigintMath.min(fromBlock + step, toBlock ? untilBlock : toBlock),
              eventName: eventName as string,
              chainId: client.chain.id,
            })
            .onConflictDoUpdate({
              set: { blockNumber: toBlock > untilBlock ? untilBlock : toBlock },
              target: [blocksProcessedTable.eventName, blocksProcessedTable.chainId],
            });
          progressSaved = true;
        } catch (dbError: any) {
          progressRetries--;
          if (dbError.cause?.code === 'ECONNRESET' || dbError.cause?.code === 'ECONNREFUSED') {
            console.warn(
              `Database connection error saving progress, retrying... (${progressRetries} attempts left)`,
            );
            await sleep(2000);
            if (progressRetries === 0) {
              throw dbError;
            }
          } else {
            throw dbError;
          }
        }
      }
    }

    // Move to next block range
    if (searchDirection === 'forward') {
      fromBlock += step;
    } else {
      fromBlock -= step;
    }
  }

  return { transactionIds, confirmationCount, lastEventBlock };
}
