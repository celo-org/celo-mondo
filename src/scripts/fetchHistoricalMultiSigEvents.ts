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

  if (process.env.RESUME_FROM_BLOCK) {
    fromBlock = BigInt(process.env.RESUME_FROM_BLOCK);
  }

  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  console.info('Starting MultiSig event backfill...');

  // Fetch all Confirmation events
  const confirmationTxIds: bigint[] = [];
  confirmationTxIds.push(
    ...(await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
      'Confirmation',
      client,
      fromBlock,
    )),
  );

  // Fetch all Revocation events
  const revocationTxIds: bigint[] = [];
  revocationTxIds.push(
    ...(await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
      'Revocation',
      client,
      fromBlock,
    )),
  );

  // Fetch all Execution events (useful for tracking execution state)
  const executionTxIds: bigint[] = [];
  executionTxIds.push(
    ...(await fetchHistoricalMultiSigEventsAndSaveToDBProgressively(
      'Execution',
      client,
      fromBlock,
    )),
  );

  // Combine all transaction IDs and process them
  const allTxIds = new Set([...confirmationTxIds, ...revocationTxIds, ...executionTxIds]);

  if (allTxIds.size > 0) {
    console.info(`Processing ${allTxIds.size} unique multisig transaction IDs...`);
    await updateApprovalsInDB(client, [...allTxIds]);
  } else {
    console.info('No multisig events found to process.');
  }

  console.info('✅ MultiSig event backfill completed successfully!');
  process.exit(0);
}

main();
