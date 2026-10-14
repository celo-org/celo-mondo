import { fireEvent, render } from '@testing-library/react';
import { ZERO_ADDRESS } from 'src/config/consts';
import * as hooks from 'src/features/account/hooks';
import { VoteSignerSettings } from 'src/features/account/VoteSignerSettings';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import * as TransactionModal from 'src/features/transactions/TransactionModal';
import * as useWriteContractWithReceipt from 'src/features/transactions/useWriteContractWithReceipt';
import { TEST_ADDRESSES } from 'src/test/anvil/constants';
import { testWrapper } from 'src/test/anvil/utils';
import { shortenAddress } from 'src/utils/addresses';
import { Address } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as wagmi from 'wagmi';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

const [me, other] = TEST_ADDRESSES as Address[];

function setup({
  signer,
  signingFor,
  isRegistered = !signingFor,
  isPending = false,
  isError = false,
}: {
  signer?: Address;
  signingFor?: Address;
  isRegistered?: boolean;
  isPending?: boolean;
  isError?: boolean;
} = {}) {
  const showTxModal = vi.fn();
  const writeContract = vi.fn();
  vi.spyOn(wagmi, 'useConnection').mockReturnValue({ address: me } as any);
  vi.spyOn(wagmi, 'useSignMessage').mockReturnValue({ mutateAsync: vi.fn() } as any);
  vi.spyOn(hooks, 'useIsAccount').mockReturnValue({
    data: isRegistered,
    isPending: false,
    isError: false,
  } as any);
  vi.spyOn(hooks, 'useAuthorizedBy').mockReturnValue({
    data: ZERO_ADDRESS,
    isPending: false,
    isError: false,
  } as any);
  vi.spyOn(hooks, 'useVoteSignerToAccount').mockReturnValue({
    signingFor: signingFor ?? me,
    isVoteSigner: !!signingFor,
  } as any);
  const refetch = vi.fn();
  vi.spyOn(hooks, 'useGetVoteSignerFor').mockReturnValue({
    data: isPending || isError ? undefined : (signer ?? me),
    isPending,
    isError,
    refetch,
  } as any);
  vi.spyOn(TransactionModal, 'useTransactionModal').mockReturnValue(showTxModal);
  vi.spyOn(useWriteContractWithReceipt, 'useWriteContractWithReceipt').mockReturnValue({
    writeContract,
    isLoading: false,
  } as any);
  return { showTxModal, writeContract, refetch };
}

describe('<VoteSignerSettings />', () => {
  afterEach(() => vi.restoreAllMocks());

  it('offers to authorize a signer when none is set', () => {
    const { showTxModal } = setup();
    const view = render(<VoteSignerSettings />, { wrapper: testWrapper });

    fireEvent.click(view.getByTestId('authorize-vote-signer'));

    expect(TransactionModal.useTransactionModal).toHaveBeenCalledWith(
      TransactionFlowType.AuthorizeVoteSigner,
    );
    expect(showTxModal).toHaveBeenCalled();
    expect(view.queryByTestId('vote-signer-status')).toBeNull();
    // a registered account cannot itself become a signer, so no proof form
    expect(view.queryByTestId('proof-of-possession-form')).toBeNull();
    expect(view.getByText(/cannot become a vote signer/)).toBeTruthy();
  });

  it('hides the authorize action until the current signer is known', () => {
    setup({ isPending: true });
    const view = render(<VoteSignerSettings />, { wrapper: testWrapper });

    expect(view.queryByTestId('authorize-vote-signer')).toBeNull();
    expect(view.queryByTestId('vote-signer-status')).toBeNull();
  });

  it('offers a retry instead of the authorize action when the signer read failed', () => {
    const { refetch } = setup({ isError: true });
    const view = render(<VoteSignerSettings />, { wrapper: testWrapper });

    expect(view.queryByTestId('authorize-vote-signer')).toBeNull();
    fireEvent.click(view.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('lets an unregistered wallet create a proof of possession', () => {
    setup({ isRegistered: false });
    const view = render(<VoteSignerSettings />, { wrapper: testWrapper });

    expect(view.getByTestId('proof-of-possession-form')).toBeTruthy();
    expect(view.getByTestId('authorize-vote-signer')).toBeTruthy();
  });

  it('shows the current signer and removes it', () => {
    const { writeContract } = setup({ signer: other });
    const view = render(<VoteSignerSettings />, { wrapper: testWrapper });

    expect(view.getByTestId('vote-signer-status').textContent).toContain(shortenAddress(other));
    fireEvent.click(view.getByText('Remove'));

    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'removeVoteSigner' }),
    );
    expect(view.queryByTestId('authorize-vote-signer')).toBeNull();
  });

  it('tells a vote signer which account it signs for', () => {
    setup({ signingFor: other });
    const view = render(<VoteSignerSettings />, { wrapper: testWrapper });

    expect(view.getByTestId('vote-signer-status').textContent).toContain(
      `vote signer for ${shortenAddress(other)}`,
    );
    expect(view.queryByTestId('authorize-vote-signer')).toBeNull();
    expect(view.queryByTestId('proof-of-possession-form')).toBeNull();
  });
});
