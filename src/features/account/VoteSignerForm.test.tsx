import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ZERO_ADDRESS } from 'src/config/consts';
import * as hooks from 'src/features/account/hooks';
import { getProofOfPossessionMessage } from 'src/features/account/voteSigner';
import { VoteSignerForm } from 'src/features/account/VoteSignerForm';
import * as useWriteContractWithReceipt from 'src/features/transactions/useWriteContractWithReceipt';
import { TEST_ADDRESSES, TEST_MNEMONIC } from 'src/test/anvil/constants';
import { testWrapper } from 'src/test/anvil/utils';
import { shortenAddress } from 'src/utils/addresses';
import * as useTrackEventModule from 'src/utils/useTrackEvent';
import { Address, TransactionReceipt } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as wagmi from 'wagmi';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

const [principal, , stranger] = TEST_ADDRESSES as Address[];
const signer = mnemonicToAccount(TEST_MNEMONIC, { addressIndex: 1 });
const otherSigner = mnemonicToAccount(TEST_MNEMONIC, { addressIndex: 3 });

function setup({
  signerIsAccount = false,
  authorizedBy = ZERO_ADDRESS,
  currentSigner = principal,
  isRegistered = true,
} = {}) {
  const writeContract = vi.fn();
  const tx: { onSuccess?: (receipt: TransactionReceipt) => unknown } = {};
  vi.spyOn(wagmi, 'useConnection').mockReturnValue({ address: principal } as any);
  vi.spyOn(hooks, 'useIsAccount').mockReturnValue({ data: isRegistered } as any);
  const chain: Record<string, unknown> = {
    isAccount: signerIsAccount,
    authorizedBy,
    getVoteSigner: currentSigner,
  };
  vi.spyOn(wagmi, 'usePublicClient').mockReturnValue({
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => chain[functionName]),
  } as any);
  vi.spyOn(useWriteContractWithReceipt, 'useWriteContractWithReceipt').mockImplementation(
    (_description, onSuccess) => {
      tx.onSuccess = onSuccess;
      return { writeContract, isLoading: false } as any;
    },
  );
  vi.spyOn(useTrackEventModule, 'useTrackEvent').mockReturnValue(vi.fn());
  return { writeContract, tx };
}

function submit(view: ReturnType<typeof render>, signature: string, address = signer.address) {
  fireEvent.change(view.getByLabelText('Vote signer address'), { target: { value: address } });
  fireEvent.change(view.getByLabelText('Proof of possession'), { target: { value: signature } });
  fireEvent.click(view.getByTestId('vote-signer-form-submit'));
}

describe('<VoteSignerForm />', () => {
  let validSignature: `0x${string}`;
  beforeAll(async () => {
    validSignature = await signer.signMessage({
      message: getProofOfPossessionMessage(principal),
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends authorizeVoteSigner with the parsed signature', async () => {
    const { writeContract } = setup();
    const view = render(<VoteSignerForm onConfirmed={vi.fn()} />, { wrapper: testWrapper });

    expect(view.getByText(/permanently ties the signer key/)).toBeTruthy();
    submit(view, validSignature);

    await waitFor(() => expect(writeContract).toHaveBeenCalledTimes(1));
    const [tx] = writeContract.mock.calls[0];
    expect(tx.functionName).toBe('authorizeVoteSigner');
    expect(tx.args[0]).toBe(signer.address);
    expect([27, 28]).toContain(tx.args[1]);
  });

  it('sends and confirms whatever was submitted last, not the first attempt', async () => {
    const { writeContract, tx } = setup();
    const onConfirmed = vi.fn();
    const view = render(<VoteSignerForm onConfirmed={onConfirmed} />, { wrapper: testWrapper });

    submit(view, validSignature);
    await waitFor(() => expect(writeContract).toHaveBeenCalledTimes(1));
    const otherSignature = await otherSigner.signMessage({
      message: getProofOfPossessionMessage(principal),
    });
    submit(view, otherSignature, otherSigner.address);

    await waitFor(() => expect(writeContract).toHaveBeenCalledTimes(2));
    expect(writeContract.mock.calls[1][0].args[0]).toBe(otherSigner.address);

    act(() => tx.onSuccess?.({ transactionHash: '0x1' } as unknown as TransactionReceipt));
    expect(onConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: [{ label: 'Signer', value: shortenAddress(otherSigner.address) }],
      }),
    );
  });

  it('rejects a proof signed for another account', async () => {
    const { writeContract } = setup();
    const view = render(<VoteSignerForm onConfirmed={vi.fn()} />, { wrapper: testWrapper });

    submit(view, await signer.signMessage({ message: getProofOfPossessionMessage(stranger) }));

    await view.findByText(/not signed by this signer/);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('rejects a signer that is already a registered account', async () => {
    const { writeContract } = setup({ signerIsAccount: true });
    const view = render(<VoteSignerForm onConfirmed={vi.fn()} />, { wrapper: testWrapper });

    submit(view, validSignature);

    await view.findByText(/already a registered account/);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('rejects submission from a wallet that is not a registered account', async () => {
    const { writeContract } = setup({ isRegistered: false });
    const view = render(<VoteSignerForm onConfirmed={vi.fn()} />, { wrapper: testWrapper });

    submit(view, validSignature);

    await view.findByText(/not a registered account/);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('refuses to replace an existing vote signer', async () => {
    const { writeContract } = setup({ currentSigner: stranger });
    const view = render(<VoteSignerForm onConfirmed={vi.fn()} />, { wrapper: testWrapper });

    submit(view, validSignature);

    await view.findByText(/Remove the current vote signer/);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('rejects a signer already authorized for another account', async () => {
    const { writeContract } = setup({ authorizedBy: stranger });
    const view = render(<VoteSignerForm onConfirmed={vi.fn()} />, { wrapper: testWrapper });

    submit(view, validSignature);

    await view.findByText(/authorized for another account/);
    expect(writeContract).not.toHaveBeenCalled();
  });
});
