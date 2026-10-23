import { fireEvent, render } from '@testing-library/react';
import { ZERO_ADDRESS } from 'src/config/consts';
import * as hooks from 'src/features/account/hooks';
import { ProofOfPossessionForm } from 'src/features/account/ProofOfPossessionForm';
import { TEST_ADDRESSES, TEST_MNEMONIC } from 'src/test/anvil/constants';
import { Address } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as wagmi from 'wagmi';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

const [principal, signer, otherSigner] = TEST_ADDRESSES as Address[];
const signerAccount = mnemonicToAccount(TEST_MNEMONIC, { addressIndex: 1 });

function setup(
  address: Address,
  boundTo?: Address,
  binding: Partial<{ isPending: boolean; isError: boolean }> = {},
) {
  vi.spyOn(wagmi, 'useConnection').mockReturnValue({ address } as any);
  vi.spyOn(hooks, 'useAuthorizedBy').mockReturnValue({
    data: binding.isPending || binding.isError ? undefined : (boundTo ?? ZERO_ADDRESS),
    isPending: !!binding.isPending,
    isError: !!binding.isError,
    refetch: vi.fn(),
  } as any);
  vi.spyOn(wagmi, 'useSignMessage').mockReturnValue({
    // Signs with the real test key so the form can recover the signer from the signature
    mutateAsync: vi.fn(({ message }) => signerAccount.signMessage({ message })),
    isPending: false,
  } as any);
  vi.spyOn(hooks, 'useIsAccount').mockReturnValue({
    data: false,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as any);
}

describe('<ProofOfPossessionForm />', () => {
  afterEach(() => vi.restoreAllMocks());

  it('withholds the form until the binding read settles and offers a retry on failure', () => {
    setup(signer, undefined, { isPending: true });
    const view = render(<ProofOfPossessionForm />);
    expect(view.getByTestId('proof-of-possession-loading')).toBeTruthy();
    expect(view.queryByTestId('proof-of-possession-form')).toBeNull();

    vi.restoreAllMocks();
    setup(signer, undefined, { isError: true });
    view.rerender(<ProofOfPossessionForm />);
    expect(view.getByTestId('proof-of-possession-error')).toBeTruthy();
    expect(view.getByText('Retry')).toBeTruthy();
    expect(view.queryByTestId('proof-of-possession-form')).toBeNull();
  });

  it('resets the form and drops the proof when the binding changes', async () => {
    setup(signer);
    const view = render(<ProofOfPossessionForm />);
    fireEvent.change(view.getByLabelText('Account to vote on behalf of'), {
      target: { value: principal },
    });
    fireEvent.click(view.getByTestId('proof-of-possession-submit'));
    await view.findByTestId('proof-of-possession-signature');

    vi.restoreAllMocks();
    setup(signer, otherSigner);
    view.rerender(<ProofOfPossessionForm />);

    expect((view.getByLabelText('Account to vote on behalf of') as HTMLInputElement).value).toBe(
      otherSigner,
    );
    expect(view.queryByTestId('proof-of-possession-signature')).toBeNull();
  });

  it('pins a previously bound wallet to the account it is tied to', async () => {
    setup(signer, principal);
    const view = render(<ProofOfPossessionForm />);

    expect(view.getByText(/stays permanently tied to it/)).toBeTruthy();
    expect((view.getByLabelText('Account to vote on behalf of') as HTMLInputElement).value).toBe(
      principal,
    );

    fireEvent.change(view.getByLabelText('Account to vote on behalf of'), {
      target: { value: otherSigner },
    });
    fireEvent.click(view.getByTestId('proof-of-possession-submit'));

    await view.findByText(/can only sign for/);
    expect(view.queryByTestId('proof-of-possession-signature')).toBeNull();
  });

  it('shows the proof only while the signer and the account it was signed for still match', async () => {
    setup(signer);
    const view = render(<ProofOfPossessionForm />);

    fireEvent.change(view.getByLabelText('Account to vote on behalf of'), {
      target: { value: principal },
    });
    fireEvent.click(view.getByTestId('proof-of-possession-submit'));
    expect((await view.findByTestId('proof-of-possession-signature')).textContent).toMatch(
      /^0x[0-9a-f]{130}$/,
    );
    expect(view.getByText(/permanently tied to their account/)).toBeTruthy();

    fireEvent.change(view.getByLabelText('Account to vote on behalf of'), {
      target: { value: otherSigner },
    });
    expect(view.queryByTestId('proof-of-possession-signature')).toBeNull();

    fireEvent.change(view.getByLabelText('Account to vote on behalf of'), {
      target: { value: principal },
    });
    expect(view.getByTestId('proof-of-possession-signature')).toBeTruthy();

    // Switching the connected wallet must not present the old wallet's proof as its own
    vi.spyOn(wagmi, 'useConnection').mockReturnValue({ address: otherSigner } as any);
    view.rerender(<ProofOfPossessionForm />);
    expect(view.queryByTestId('proof-of-possession-signature')).toBeNull();
  });
});
