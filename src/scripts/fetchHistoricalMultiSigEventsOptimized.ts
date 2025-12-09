/* eslint no-console: 0 */

import 'dotenv/config';

import { eq } from 'drizzle-orm';
import {
  getProposalApprovedEvents,
  getProposalDequeuedEvents,
} from 'src/app/governance/proposalEvents';
import database from 'src/config/database';
import { approvalsTable } from 'src/db/schema';
import fetchHistoricalMultiSigEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalMultiSigEventsAndSaveToDBProgressively';
import updateApprovalsInDB from 'src/features/governance/updateApprovalsInDB';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

// Block time changed from 5 seconds to 1 second at block 31056500
const BLOCK_TIME_CHANGE_BLOCK = 31_056_500n;

// New block times (1 second per block, after block 31056500)
const TEN_DAYS_IN_BLOCKS_NEW = 864_000n;
const THREE_DAYS_IN_BLOCKS_NEW = 259_200n; // Execution window: 3 days after last confirmation
const BACKWARD_SEARCH_BLOCKS_NEW = 400_000n;

// Old block times (5 seconds per block, before block 31056500)
const TEN_DAYS_IN_BLOCKS_OLD = 172_800n; // 10 days * 86400 sec/day / 5 sec/block
const SIX_DAYS_IN_BLOCKS_OLD = 103_680n; // 6 days * 86400 sec/day / 5 sec/block - execution window after last confirmation
const BACKWARD_SEARCH_BLOCKS_OLD = 80_000n;

const TARGET_CONFIRMATIONS = 3;

/**
 * Get block time constants based on block number
 */
function getBlockTimeConstants(blockNumber: bigint) {
  if (blockNumber < BLOCK_TIME_CHANGE_BLOCK) {
    return {
      tenDays: TEN_DAYS_IN_BLOCKS_OLD,
      executionWindowAfterConfirmation: SIX_DAYS_IN_BLOCKS_OLD,
      backwardSearch: BACKWARD_SEARCH_BLOCKS_OLD,
    };
  } else {
    return {
      tenDays: TEN_DAYS_IN_BLOCKS_NEW,
      executionWindowAfterConfirmation: THREE_DAYS_IN_BLOCKS_NEW,
      backwardSearch: BACKWARD_SEARCH_BLOCKS_NEW,
    };
  }
}

/**
 * Optimized script to backfill MultiSig events efficiently.
 *
 * Strategy:
 * 1. Get all ProposalDequeued events from DB (these mark when proposals enter approval phase)
 * 2. For each proposal, search forward 10 days for Confirmation/Revocation events
 * 3. If 3+ confirmations found, search for Executions starting from the last confirmation block:
 *    - Old blocks (< 31056500, 5 sec/block): search 6 days forward
 *    - New blocks (≥ 31056500, 1 sec/block): search 3 days forward
 * 4. Validate: if ProposalApproved exists but < 3 Confirmations found, search backward
 *
 * This is much more efficient than scanning the entire chain!
 *
 * Usage:
 *   tsx src/scripts/fetchHistoricalMultiSigEventsOptimized.ts
 *   tsx src/scripts/fetchHistoricalMultiSigEventsOptimized.ts --skip 141,149,150
 */
async function main() {
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 60_000, // 1 minute - archive nodes can be slow
    }),
  }) as PublicClient<Transport, Chain>;

  console.info('🚀 Starting optimized MultiSig event backfill...');
  console.info(`📋 Strategy: Search forward from ProposalDequeued events with 10-day window\n`);

  // Parse --skip CLI argument
  const skipProposalIds = new Set<number>();
  const skipIndex = process.argv.indexOf('--skip');
  if (skipIndex !== -1 && process.argv[skipIndex + 1]) {
    const ids = process.argv[skipIndex + 1].split(',').map((id) => parseInt(id.trim(), 10));
    ids.forEach((id) => skipProposalIds.add(id));
    console.info(
      `⏭️  Will skip ${skipProposalIds.size} proposals: ${Array.from(skipProposalIds).join(', ')}\n`,
    );
  }

  const onlyProposalIds = new Set<number>();
  const onlyIndex = process.argv.indexOf('--only');
  if (onlyIndex !== -1 && process.argv[onlyIndex + 1]) {
    const ids = process.argv[onlyIndex + 1].split(',').map((id) => parseInt(id.trim(), 10));
    ids.forEach((id) => onlyProposalIds.add(id));
    console.info(
      `⏭️  Will only process ${onlyProposalIds.size} proposals: ${Array.from(onlyProposalIds).join(', ')}\n`,
    );
  }

  // Step 1: Get all processed proposal IDs from approvals table (for resumability)
  console.info('🔍 Checking for already processed proposals...');
  const processedProposals = await database
    .selectDistinct({
      proposalId: approvalsTable.proposalId,
    })
    .from(approvalsTable)
    .where(eq(approvalsTable.chainId, client.chain.id));

  const processedProposalIds = new Set(processedProposals.map((p) => p.proposalId));

  if (processedProposalIds.size > 0) {
    console.info(`✅ Found ${processedProposalIds.size} already processed proposals`);
    console.info(`   Will skip these and process remaining proposals...\n`);
  } else {
    console.info(`📋 No previously processed proposals found, starting from beginning\n`);
  }

  // Step 2: Get all ProposalDequeued events from the database
  console.info('📥 Fetching ProposalDequeued events from database...');
  const allDequeuedEvents = await getProposalDequeuedEvents(client.chain.id);

  // Filter to only unprocessed proposals (not in processedProposalIds set)
  const dequeuedEvents = allDequeuedEvents.filter(
    (e) =>
      !processedProposalIds.has(e.proposalId) &&
      onlyProposalIds.has(e.proposalId) &&
      !skipProposalIds.has(e.proposalId),
  );

  console.info(`Found ${allDequeuedEvents.length} total dequeued proposals`);
  console.info(`Already processed: ${processedProposalIds.size}`);
  if (onlyProposalIds.size > 0) {
    console.info(`Keeping (via --only): ${onlyProposalIds.size}`);
  } else if (skipProposalIds.size > 0) {
    console.info(`Skipping (via --skip): ${skipProposalIds.size}`);
  }
  console.info(
    `Remaining to process: ${dequeuedEvents.map((event) => event.proposalId).join(', ')}\n`,
  );

  if (dequeuedEvents.length === 0) {
    console.info('✅ All proposals already processed! Nothing to do.');
    process.exit(0);
  }

  // Step 3: Get all ProposalApproved events for validation
  console.info('📥 Fetching ProposalApproved events from database...');
  const approvedEvents = await getProposalApprovedEvents(client.chain.id);
  const approvedMap = new Map(approvedEvents.map((e) => [e.proposalId, e.blockNumber]));
  console.info(`Found ${approvedEvents.length} approved proposals\n`);

  // Track results
  const resultsMap = new Map<
    number,
    { confirmationsFound: number; searchedForward: boolean; searchedBackward: boolean }
  >();

  // Track overall statistics
  let totalConfirmations = 0;
  let totalRevocations = 0;
  let totalExecutions = 0;

  // Step 4: For each unprocessed dequeued proposal, search forward for Confirmation events
  for (let i = 0; i < dequeuedEvents.length; i++) {
    const { proposalId, blockNumber: dequeuedBlock } = dequeuedEvents[i];
    console.info(`\n[${i + 1}/${dequeuedEvents.length}] Processing Proposal ${proposalId}`);
    console.info(`  Dequeued at block: ${dequeuedBlock}`);

    // Track events for this specific proposal
    const proposalConfirmationTxIds: bigint[] = [];
    const proposalRevocationTxIds: bigint[] = [];
    const proposalExecutionTxIds: bigint[] = [];

    // Get appropriate block time constants for this proposal
    const blockConstants = getBlockTimeConstants(dequeuedBlock);
    const isOldBlockTime = dequeuedBlock < BLOCK_TIME_CHANGE_BLOCK;
    if (isOldBlockTime) {
      console.info(`  ⏱️  Using old block times (5 sec/block)`);
    }

    // Search forward from dequeue block
    console.info(`  🔍 Searching forward ${blockConstants.tenDays} blocks for Confirmations...`);
    const forwardResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
      'Confirmation',
      client,
      {
        fromBlock: dequeuedBlock,
        maxBlockRange: blockConstants.tenDays,
        searchDirection: 'forward',
        saveProgress: false, // Don't save progress for targeted searches
      },
    );

    // Track confirmation events for this proposal
    proposalConfirmationTxIds.push(...forwardResult.transactionIds);
    totalConfirmations += forwardResult.transactionIds.length;

    resultsMap.set(proposalId, {
      confirmationsFound: forwardResult.confirmationCount,
      searchedForward: true,
      searchedBackward: false,
    });

    console.info(`  ✅ Found ${forwardResult.confirmationCount} Confirmations in range`);

    // Only search for Execution events if we found 3+ confirmations in the range
    // (If < 3 total confirmations, there can't be 3 for this specific proposal)
    let executionFound = false;
    if (forwardResult.confirmationCount >= TARGET_CONFIRMATIONS && forwardResult.lastEventBlock) {
      // Start execution search from the block of the last confirmation found
      const executionStartBlock = forwardResult.lastEventBlock;
      console.info(
        `  🔍 Searching for Executions starting at block ${executionStartBlock} (last confirmation block)`,
      );

      // Determine execution window based on when the last confirmation happened
      const executionBlockConstants = getBlockTimeConstants(executionStartBlock);

      const executionResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
        'Execution',
        client,
        {
          fromBlock: executionStartBlock,
          maxBlockRange: executionBlockConstants.executionWindowAfterConfirmation,
          searchDirection: 'forward',
          saveProgress: false,
        },
      );

      proposalExecutionTxIds.push(...executionResult.transactionIds);
      totalExecutions += executionResult.transactionIds.length;
      if (executionResult.transactionIds.length > 0) {
        console.info(`  🎯 Found ${executionResult.transactionIds.length} Executions in range`);
        executionFound = true;
      }
    } else if (
      forwardResult.confirmationCount >= TARGET_CONFIRMATIONS &&
      !forwardResult.lastEventBlock
    ) {
      console.info(`  ⏭️  Skipping execution search (no confirmation block found)`);
    } else {
      console.info(`  ⏭️  Skipping execution search (< 3 confirmations in range)`);
    }

    // Search for Revocations if: no execution search happened OR execution search found nothing
    if (!executionFound) {
      const revocationResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
        'Revocation',
        client,
        {
          fromBlock: dequeuedBlock,
          maxBlockRange: blockConstants.tenDays,
          searchDirection: 'forward',
          saveProgress: false,
        },
      );

      proposalRevocationTxIds.push(...revocationResult.transactionIds);
      totalRevocations += revocationResult.transactionIds.length;
      if (revocationResult.transactionIds.length > 0) {
        console.info(`  📝 Found ${revocationResult.transactionIds.length} Revocations in range`);
      }
    } else {
      console.info(`  ⏭️  Skipping revocation search (execution found)`);
    }

    // Progressive update: Update approvals table immediately after processing this proposal
    if (proposalConfirmationTxIds.length > 0) {
      console.info(
        `  💾 Updating approvals table with ${proposalConfirmationTxIds.length} confirmations...`,
      );
      try {
        await updateApprovalsInDB(client, [...new Set(proposalConfirmationTxIds)], 'confirmations');
        console.info(`  ✅ Confirmations saved to DB`);
      } catch (error) {
        console.error(`  ❌ Error updating confirmations:`, error);
      }
    }

    if (proposalRevocationTxIds.length > 0) {
      console.info(`  💾 Processing ${proposalRevocationTxIds.length} revocations...`);
      try {
        await updateApprovalsInDB(client, [...new Set(proposalRevocationTxIds)], 'revocations');
        console.info(`  ✅ Revocations processed`);
      } catch (error) {
        console.error(`  ❌ Error processing revocations:`, error);
      }
    }

    // Immediate validation: Check if this proposal has ProposalApproved event but not enough confirmations
    if (approvedMap.has(proposalId)) {
      const approvedBlock = approvedMap.get(proposalId)!;
      const confirmationsFound = forwardResult.confirmationCount;

      if (confirmationsFound < TARGET_CONFIRMATIONS) {
        console.warn(
          `  ⚠️  Proposal ${proposalId} was APPROVED but only found ${confirmationsFound}/${TARGET_CONFIRMATIONS} confirmations`,
        );
        console.info(`  🔙 Searching backward from ProposalApproved at block ${approvedBlock}...`);

        const backwardConstants = getBlockTimeConstants(approvedBlock);
        const backwardResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
          'Confirmation',
          client,
          {
            fromBlock: approvedBlock,
            maxBlockRange: backwardConstants.backwardSearch,
            searchDirection: 'backward',
            saveProgress: false,
          },
        );

        // Update approvals table immediately with backward search results
        if (backwardResult.transactionIds.length > 0) {
          console.info(
            `  💾 Updating approvals with ${backwardResult.transactionIds.length} backward confirmations...`,
          );
          try {
            await updateApprovalsInDB(
              client,
              [...new Set(backwardResult.transactionIds)],
              'confirmations',
            );
            console.info(`  ✅ Backward confirmations saved to DB`);
          } catch (error) {
            console.error(`  ❌ Error updating backward confirmations:`, error);
          }
        }

        totalConfirmations += backwardResult.transactionIds.length;

        const totalFound = confirmationsFound + backwardResult.confirmationCount;
        resultsMap.set(proposalId, {
          confirmationsFound: totalFound,
          searchedForward: true,
          searchedBackward: true,
        });

        if (totalFound >= TARGET_CONFIRMATIONS) {
          console.info(
            `  ✅ Found ${backwardResult.confirmationCount} additional confirmations (total: ${totalFound})`,
          );
        } else {
          console.error(
            `  ❌ Still missing confirmations for Proposal ${proposalId}: ${totalFound}/${TARGET_CONFIRMATIONS}`,
          );
        }
      }
    }

    console.info(
      `  📊 Progress: ${totalConfirmations} confirmations, ${totalRevocations} revocations, ${totalExecutions} executions total`,
    );
  }

  // Print summary (approvals were updated progressively during processing)
  console.info(`\n\n📊 Final Summary:`);
  console.info(`  Total proposals processed: ${dequeuedEvents.length}`);
  console.info(`  Total confirmations found: ${totalConfirmations}`);
  console.info(`  Total revocations found: ${totalRevocations}`);
  console.info(`  Total executions found: ${totalExecutions}`);

  console.info('\n✅ Optimized MultiSig event backfill completed!');
  process.exit(0);
}

main();
