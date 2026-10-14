import { fireEvent, render } from '@testing-library/react';
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

function setup(address: Address) {
  vi.spyOn(wagmi, 'useConnection').mockReturnValue({ address } as any);
  vi.spyOn(wagmi, 'useSignMessage').mockReturnValue({
    // Signs with the real test key so the form can recover the signer from the signature
    mutateAsync: vi.fn(({ message }) => signerAccount.signMessage({ message })),
    isPending: false,
  } as any);
  vi.spyOn(hooks, 'useIsAccount').mockReturnValue({ data: false } as any);
}

describe('<ProofOfPossessionForm />', () => {
  afterEach(() => vi.restoreAllMocks());

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
