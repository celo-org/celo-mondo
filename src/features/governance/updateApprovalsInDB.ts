/* eslint no-console: 0 */

import { governanceABI, multiSigABI } from '@celo/abis';
import { and, eq } from 'drizzle-orm';
import { fetchMultiSigEvents } from 'src/app/governance/multisigEvents';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { approvalsTable } from 'src/db/schema';
import { Address, Chain, PublicClient, Transport, decodeFunctionData } from 'viem';

import { revalidateTag } from 'next/cache';
import { CacheKeys } from 'src/config/consts';
import '../../vendor/polyfill';

interface ConfirmationEventArgs {
  sender: Address;
  transactionId: bigint;
}

interface RevocationEventArgs {
  sender: Address;
  transactionId: bigint;
}

/**
 * Fetches the approver multisig address from the Governance contract
 */
async function getApproverMultisigAddress(
  client: PublicClient<Transport, Chain>,
): Promise<Address> {
  return await client.readContract({
    address: Addresses.Governance,
    abi: governanceABI,
    functionName: 'approver',
    args: [],
  });
}

/**
 * Updates the approvals table based on Confirmation and Revocation events from the MultiSig contract.
 * This function processes events that have already been saved to the events table.
 *
 * @param client - The viem public client
 * @param multisigTxIds - Optional array of specific multisig transaction IDs to process
 */
export default async function updateApprovalsInDB(
  client: PublicClient<Transport, Chain>,
  multisigTxIds?: bigint[],
  type?: 'confirmations' | 'revocations',
): Promise<void> {
  // First, get the approver multisig address from the Governance contract
  const approverMultisigAddress = await getApproverMultisigAddress(client);
  console.info(`Processing events for approver multisig: ${approverMultisigAddress}`);

  // no type means do all
  if (!type || type === 'confirmations') {
    // Process Confirmation events (add approvals)
    await processConfirmations(client, approverMultisigAddress, multisigTxIds);
  }
  if (!type || type === 'revocations') {
    // Process Revocation events (remove approvals)
    await processRevocations(client, approverMultisigAddress, multisigTxIds);
  }
  if (process.env.NODE_ENV === 'test') {
    console.info('not revalidating cache in test mode');
    return;
  } // Revalidate the cache
  else if (process.env.CI === 'true') {
    const BASE_URL = process.env.IS_PRODUCTION_DATABASE
      ? 'https://mondo.celo.org'
      : 'https://preview-celo-mondo.vercel.app';
    // Revalidate all proposal-related caches
    await fetch(`${BASE_URL}/api/governance/proposals`, { method: 'DELETE' });
  } else if (process.env.NEXT_RUNTIME) {
    // Only revalidate if running in a Next.js runtime
    revalidateTag(CacheKeys.AllProposals);
  }
}

async function processConfirmations(
  client: PublicClient<Transport, Chain>,
  approverMultisigAddress: Address,
  multisigTxIds?: bigint[],
): Promise<void> {
  // Fetch Confirmation events using the helper function
  let confirmationEvents;
  if (multisigTxIds && multisigTxIds.length > 0) {
    // If specific transaction IDs are provided, fetch each one
    const allEvents = await Promise.all(
      multisigTxIds.map((txId) =>
        fetchMultiSigEvents(client.chain.id, approverMultisigAddress, 'Confirmation', {
          transactionId: txId,
        }),
      ),
    );
    confirmationEvents = allEvents.flat();
  } else {
    // Otherwise fetch all Confirmation events
    confirmationEvents = await fetchMultiSigEvents(
      client.chain.id,
      approverMultisigAddress,
      'Confirmation',
    );
  }

  const rowsToInsert = [] as (typeof approvalsTable.$inferInsert)[];
  if (!confirmationEvents) {
    console.info('No ConfirmationEvents found');
    return;
  }
  console.info(`Processing ${confirmationEvents.length} Confirmation events`);

  for (const event of confirmationEvents) {
    const args = event.args as unknown as ConfirmationEventArgs;
    const multisigTxId = args.transactionId;
    const approver = args.sender;

    try {
      // Fetch the multisig transaction details from the blockchain
      const multisigTx = await client.readContract({
        address: approverMultisigAddress,
        abi: multiSigABI,
        functionName: 'transactions',
        args: [multisigTxId],
      });

      // multisigTx returns: [destination, value, data, executed]
      const [_destination, _value, data, _executed] = multisigTx;

      // Decode the calldata to extract the proposalId
      let proposalId: number | undefined;
      try {
        const decoded = decodeFunctionData({
          abi: governanceABI,
          data: data as `0x${string}`,
        });

        // Check if this is an approve call
        if (decoded.functionName === 'approve') {
          proposalId = Number(decoded.args[0]); // proposalId is the first argument
          console.log(
            `Found approval for proposal ${proposalId} by ${approver} (multisigTxId: ${multisigTxId})`,
          );
        } else {
          console.log(
            `Skipping multisigTxId ${multisigTxId}: not an approve call (function: ${decoded.functionName})`,
          );
          continue;
        }
      } catch (decodeError) {
        console.warn(`Failed to decode calldata for multisigTxId ${multisigTxId}:`, decodeError);
        continue;
      }

      if (proposalId === undefined) {
        continue;
      }

      // Get the block timestamp
      const block = await client.getBlock({ blockNumber: event.blockNumber });

      rowsToInsert.push({
        chainId: client.chain.id,
        proposalId,
        multisigTxId: Number(multisigTxId),
        approver,
        confirmedAt: Number(block.timestamp),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    } catch (error) {
      console.error(`Error processing multisigTxId ${multisigTxId}:`, error);
      // Continue processing other events
    }
  }

  if (rowsToInsert.length === 0) {
    console.info('No confirmations to insert');
    return;
  }

  // Insert rows individually to handle errors gracefully
  let insertedCount = 0;
  for (const row of rowsToInsert) {
    try {
      const { count } = await database.insert(approvalsTable).values(row).onConflictDoNothing(); // If the same approver confirms the same proposal again, ignore
      insertedCount += count;
    } catch (error) {
      console.error(
        `Failed to insert approval for proposal ${row.proposalId} by ${row.approver}:`,
        error,
      );
      // Continue processing other rows
    }
  }

  console.info(`Inserted ${insertedCount} new approvals`);
}

async function processRevocations(
  client: PublicClient<Transport, Chain>,
  approverMultisigAddress: Address,
  multisigTxIds?: bigint[],
): Promise<void> {
  // Fetch Revocation events using the helper function
  let revocationEvents;
  if (multisigTxIds && multisigTxIds.length > 0) {
    // If specific transaction IDs are provided, fetch each one
    const allEvents = await Promise.all(
      multisigTxIds.map((txId) =>
        fetchMultiSigEvents(client.chain.id, approverMultisigAddress, 'Revocation', {
          transactionId: txId,
        }),
      ),
    );
    revocationEvents = allEvents.flat();
  } else {
    // Otherwise fetch all Revocation events
    revocationEvents = await fetchMultiSigEvents(
      client.chain.id,
      approverMultisigAddress,
      'Revocation',
    );
  }

  console.info(`Processing ${revocationEvents.length} Revocation events`);

  let deletedCount = 0;

  for (const event of revocationEvents) {
    const args = event.args as unknown as RevocationEventArgs;
    const multisigTxId = args.transactionId;
    const approver = args.sender;

    try {
      // We need to find the proposalId for this multisigTxId
      // Check if we have any approval in our DB for this multisigTxId
      const existingApproval = await database
        .select()
        .from(approvalsTable)
        .where(
          and(
            eq(approvalsTable.chainId, client.chain.id),
            eq(approvalsTable.multisigTxId, Number(multisigTxId)),
            eq(approvalsTable.approver, approver),
          ),
        )
        .limit(1);

      if (existingApproval.length === 0) {
        console.log(
          `No existing approval found for multisigTxId ${multisigTxId} by ${approver}, skipping revocation`,
        );
        continue;
      }

      const { proposalId } = existingApproval[0];

      // Delete the approval
      await database
        .delete(approvalsTable)
        .where(
          and(
            eq(approvalsTable.chainId, client.chain.id),
            eq(approvalsTable.proposalId, proposalId),
            eq(approvalsTable.approver, approver),
          ),
        );

      console.log(`Revoked approval for proposal ${proposalId} by ${approver}`);
      deletedCount++;
    } catch (error) {
      console.error(
        `Error processing revocation for multisigTxId ${multisigTxId} by ${approver}:`,
        error,
      );
      // Continue processing other events
    }
  }

  console.info(`Deleted ${deletedCount} revoked approvals`);
}
