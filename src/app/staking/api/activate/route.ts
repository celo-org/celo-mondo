import { electionABI } from '@celo/abis';
import { DAY } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import {
  StakeActivationRequest,
  StakeActivationRequestSchema,
} from 'src/features/staking/autoActivation';
import { eqAddress } from 'src/utils/addresses';
import { createCeloPublicClient, createCeloWalletClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { errorToString } from 'src/utils/strings';
import { privateKeyToAccount } from 'viem/accounts';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  logger.debug('Stake activation request received');
  let activationRequest: StakeActivationRequest;
  try {
    const body = await request.json();
    activationRequest = StakeActivationRequestSchema.parse(body);
  } catch (error) {
    logger.warn('Request validation error', error);
    return new Response('Invalid stake activation request', {
      status: 400,
    });
  }

  try {
    const { address, transactionHash } = activationRequest;
    logger.debug(`Attempting activation for address ${address} with tx ${transactionHash}`);
    const activationTxHash = await activateStake(activationRequest);
    return new Response(
      `Stake activation successful for ${address}. Tx hash: ${activationTxHash}`,
      {
        status: 200,
      },
    );
  } catch (error) {
    logger.error('Stake activation error', error);
    return new Response(`Unable to auto-activate stake: ${errorToString(error)}`, {
      status: 500,
    });
  }
}

async function activateStake(request: StakeActivationRequest) {
  const address = request.address as HexString;
  const group = request.group as HexString;
  const transactionHash = request.transactionHash as HexString;

  const client = createCeloPublicClient();

  const transaction = await client.getTransaction({ hash: transactionHash });
  if (!eqAddress(transaction.from, address))
    throw new Error('Tx sender and request address do not match');
  if (!transaction.to || !eqAddress(transaction.to, Addresses.Election))
    throw new Error('Tx not to election contract');

  const latestBlock = await client.getBlockNumber();
  const block = await client.getBlock({ blockNumber: transaction.blockNumber });
  const confirmations = latestBlock - transaction.blockNumber;
  // Ensure at least 1/3 of validators have confirmed the tx to prevent rogue validator spoofing
  if (confirmations < 33n) throw new Error('Transaction lacks sufficient confirmations');
  const timePassed = Date.now() - Number(block.timestamp) * 1000;
  if (timePassed > 3 * DAY) throw new Error('Transaction is too old');

  // Used to validate tx logs but that's not strictly needed
  // and fetching them for old txs was causing problems
  // const log = transaction.logs[0];
  // const { eventName, args } = decodeEventLog({
  //   abi: electionABI,
  //   data: log.data,
  //   topics: log.topics,
  //   strict: true,
  // });
  // if (eventName !== 'ValidatorGroupVoteCast') throw new Error('Transaction is not a stake vote');
  // if (!eqAddress(args.account, address))
  //   throw new Error('Transaction staker does not match request');

  const hasActivatable = await client.readContract({
    address: Addresses.Election,
    abi: electionABI,
    functionName: 'hasActivatablePendingVotes',
    args: [address, group],
  });
  if (!hasActivatable) throw new Error('Stake is not activatable');

  const walletClient = getWalletClient();

  logger.debug(`Sending activation tx on behalf of ${address}`);
  const activationTxHash = await walletClient.writeContract({
    address: Addresses.Election,
    abi: electionABI,
    functionName: 'activateForAccount',
    args: [group, address],
  });
  logger.debug(`Activation tx confirmed: ${activationTxHash}`);
  return activationTxHash;
}

function getWalletClient() {
  const privateKey = process.env.STAKE_ACTIVATION_PRIVATE_KEY as HexString;
  if (!privateKey) throw new Error('No private key set for staking activation');
  const account = privateKeyToAccount(privateKey);

  return createCeloWalletClient(account);
}
