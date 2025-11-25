/* eslint no-console: 0 */

import 'dotenv/config';

import fetchHistoricalMultiSigEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalMultiSigEventsAndSaveToDBProgressively';
import updateApprovalsInDB from 'src/features/governance/updateApprovalsInDB';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

/**
 * Script to backfill historical MultiSig events (Confirmation, Revocation, Execution)
 * and populate the approvals table.
 *
 * Usage:
 *   tsx src/scripts/fetchHistoricalMultiSigEvents.ts
 *   RESUME_FROM_BLOCK=12345678 tsx src/scripts/fetchHistoricalMultiSigEvents.ts
 */
async function main() {
  let fromBlock: bigint | undefined;
  let untilBlock: bigint | undefined;
  if (process.env.RESUME_FROM_BLOCK) {
    fromBlock = BigInt(process.env.RESUME_FROM_BLOCK);
  }
  if (process.env.END_AT_BLOCK) {
    untilBlock = BigInt(process.env.END_AT_BLOCK);
  }

  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 60_000, // 1 minute - archive nodes can be slow
    }),
  }) as PublicClient<Transport, Chain>;

  console.info('Starting MultiSig event backfill...');

  // Fetch all Confirmation events
  const confirmationResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
    'Confirmation',
    client,
    { fromBlock, untilBlock },
  );
  if (confirmationResult.transactionIds.length) {
    try {
      console.info('adding confirmations');
      await updateApprovalsInDB(client, [...confirmationResult.transactionIds], 'confirmations');
    } catch (error) {
      console.error('Error updating approvals in DB:', error);
      console.info('Some approvals may not have been updated. Check logs for details.');
    }
  }

  // Fetch all Revocation events
  const revocationResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
    'Revocation',
    client,
    { fromBlock, untilBlock },
  );
  if (revocationResult.transactionIds.length) {
    try {
      console.info('removing confirmations');
      await updateApprovalsInDB(client, [...revocationResult.transactionIds], 'revocations');
    } catch (error) {
      console.error('Error updating approvals in DB:', error);
      console.info('Some approvals may not have been updated. Check logs for details.');
    }
  }

  // Fetch all Execution events (useful for tracking execution state)
  const executionResult = await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
    'Execution',
    client,
    { fromBlock, untilBlock },
  );
  // exectution events for multisig are saved just to keep track but we dont yet create any other db entries from them
  console.info('execution result', executionResult);
  if (process.env.UPDATE_ALL) {
    console.info(`Processing all multisig transaction IDs...`);
    try {
      await updateApprovalsInDB(client);
    } catch (error) {
      console.error('Error updating approvals in DB:', error);
      console.info('Some approvals may not have been updated. Check logs for details.');
    }
  }

  console.info('✅ MultiSig event backfill completed successfully!');
  process.exit(0);
}

main();
