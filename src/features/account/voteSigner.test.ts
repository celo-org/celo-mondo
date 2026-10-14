import { accountsABI, registryABI } from '@celo/abis';
import { REGISTRY_ADDRESS } from 'src/config/contracts';
import {
  getProofOfPossessionMessage,
  parseProofOfPossession,
  recoverProofOfPossessionSigner,
} from 'src/features/account/voteSigner';
import { TEST_ADDRESSES, TEST_MNEMONIC } from 'src/test/anvil/constants';
import { anvil, publicClient, testClient, walletClient } from 'src/test/anvil/utils';
import { Address, Hex, createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

// The first mnemonic account is already registered with the Accounts contract at the
// fork block, so it can act as the principal without a createAccount tx. The second
// account is neither registered nor authorized, which is what a fresh signer looks like.
const principal = walletClient;
const signer = createWalletClient({
  account: mnemonicToAccount(TEST_MNEMONIC, { addressIndex: 1 }),
  chain: anvil,
  transport: http(),
});

describe('parseProofOfPossession', () => {
  const body = `0x${'ab'.repeat(32)}${'cd'.repeat(32)}` as const;

  test('derives v from either 27/28 or 0/1 recovery bytes', () => {
    expect(parseProofOfPossession(`${body}1b`).v).toBe(27);
    expect(parseProofOfPossession(`${body}1c`).v).toBe(28);
    expect(parseProofOfPossession(`${body}00`).v).toBe(27);
    expect(parseProofOfPossession(`${body}01`).v).toBe(28);
    expect(parseProofOfPossession(`${body}1b`)).toMatchObject({
      r: `0x${'ab'.repeat(32)}`,
      s: `0x${'cd'.repeat(32)}`,
    });
  });
});

describe('vote signer authorization on a Celo mainnet fork', () => {
  let accounts: Address;
  let snapshot: Hex;

  beforeAll(async () => {
    snapshot = await testClient.snapshot();
    accounts = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: registryABI,
      functionName: 'getAddressForStringOrDie',
      args: ['Accounts'],
    });
  }, 60_000);

  afterAll(async () => {
    // Other test files assert on the fork block number, so undo the mined blocks.
    await testClient.revert({ id: snapshot });
  });

  const readSigner = (functionName: 'getVoteSigner' | 'voteSignerToAccount', arg: Address) =>
    publicClient.readContract({ address: accounts, abi: accountsABI, functionName, args: [arg] });

  test('authorizes and removes a vote signer using a proof of possession', async () => {
    expect(signer.account.address).toBe(TEST_ADDRESSES[1]);
    await expect(readSigner('getVoteSigner', principal.account.address)).resolves.toBe(
      principal.account.address,
    );

    const signature = await signer.signMessage({
      message: getProofOfPossessionMessage(principal.account.address),
    });
    await expect(
      recoverProofOfPossessionSigner(principal.account.address, signature),
    ).resolves.toBe(signer.account.address);

    const { v, r, s } = parseProofOfPossession(signature);
    const { request } = await publicClient.simulateContract({
      account: principal.account,
      address: accounts,
      abi: accountsABI,
      functionName: 'authorizeVoteSigner',
      args: [signer.account.address, v, r, s],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: await principal.writeContract(request),
    });
    expect(receipt.status).toBe('success');

    await expect(readSigner('getVoteSigner', principal.account.address)).resolves.toBe(
      signer.account.address,
    );
    await expect(readSigner('voteSignerToAccount', signer.account.address)).resolves.toBe(
      principal.account.address,
    );

    const removal = await publicClient.simulateContract({
      account: principal.account,
      address: accounts,
      abi: accountsABI,
      functionName: 'removeVoteSigner',
    });
    await publicClient.waitForTransactionReceipt({
      hash: await principal.writeContract(removal.request),
    });
    await expect(readSigner('getVoteSigner', principal.account.address)).resolves.toBe(
      principal.account.address,
    );
  }, 60_000);

  test('rejects a proof of possession signed for a different account', async () => {
    const signature = await signer.signMessage({
      message: getProofOfPossessionMessage(TEST_ADDRESSES[2] as Address),
    });
    const { v, r, s } = parseProofOfPossession(signature);

    await expect(
      publicClient.simulateContract({
        account: principal.account,
        address: accounts,
        abi: accountsABI,
        functionName: 'authorizeVoteSigner',
        args: [signer.account.address, v, r, s],
      }),
    ).rejects.toThrow('Invalid signature');
  }, 60_000);
});
