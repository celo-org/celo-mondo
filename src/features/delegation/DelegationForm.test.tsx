import { render, waitFor } from '@testing-library/react';
import * as hooks from 'src/features/account/hooks';
import { DelegationForm } from 'src/features/delegation/DelegationForm';
import * as useDelegatees from 'src/features/delegation/hooks/useDelegatees';
import * as useDelegationBalances from 'src/features/delegation/hooks/useDelegationBalances';
import * as useWriteContractWithReceipt from 'src/features/transactions/useWriteContractWithReceipt';
import { TEST_ADDRESSES } from 'src/test/anvil/constants';
import * as useAddressToLabelModule from 'src/utils/useAddressToLabel';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as wagmi from 'wagmi';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

describe('<DelegationForm />', () => {
  beforeEach(async () => {
    vi.spyOn(wagmi, 'useAccount').mockReturnValue({
      isLoading: false,
      address: TEST_ADDRESSES[0],
    } as any);
    vi.spyOn(wagmi, 'useReadContract').mockRejectedValue({ data: undefined });
    vi.spyOn(useWriteContractWithReceipt, 'useWriteContractWithReceipt').mockReturnValue({} as any);
    vi.spyOn(useAddressToLabelModule, 'useAddressToLabel').mockImplementation(() => () => ({
      label: 'test label',
      address: '0x123456',
      fallback: '0x123...456',
      isCeloName: false,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows delegate button for a registered account', async () => {
    setupHooks({ isRegistered: true });

    const form = render(<DelegationForm onConfirmed={() => {}} />);

    await waitFor(async () => await form.findByTestId('delegate-form-submit'));

    expect(form.queryByTestId('delegate-form-submit')?.getAttribute('disabled')).toBeNull();
    expect(form.queryByTestId('delegate-form-warning')).toBeFalsy();
  });

  it('does not show delegate button for a vote signer for a validator', async () => {
    setupHooks({
      voteSignerForAddress: TEST_ADDRESSES[1],
      isValidator: true,
    });

    const form = render(<DelegationForm onConfirmed={() => {}} />);

    await waitFor(async () => await form.findByTestId('delegate-form-submit'));

    expect(form.queryByTestId('delegate-form-submit')?.getAttribute('disabled')).toEqual('');
    expect(form.queryByTestId('delegate-form-warning')).toBeTruthy();
  });

  it('does not show delegate button for a vote signer for a validator group', async () => {
    setupHooks({
      voteSignerForAddress: TEST_ADDRESSES[1],
      isValidatorGroup: true,
    });

    const form = render(<DelegationForm onConfirmed={() => {}} />);

    await waitFor(async () => await form.findByTestId('delegate-form-submit'));

    expect(form.queryByTestId('delegate-form-submit')?.getAttribute('disabled')).toEqual('');
    expect(form.queryByTestId('delegate-form-warning')).toBeTruthy();
  });

  it('does not show delegate button for a validator', async () => {
    setupHooks({ isRegistered: true, isValidator: true });

    const form = render(<DelegationForm onConfirmed={() => {}} />);

    await waitFor(async () => await form.findByTestId('delegate-form-submit'));

    expect(form.queryByTestId('delegate-form-submit')?.getAttribute('disabled')).toEqual('');
    expect(form.queryByTestId('delegate-form-warning')).toBeTruthy();
  });

  it('does not show delegate button for a validator group', async () => {
    setupHooks({ isRegistered: true, isValidatorGroup: true });

    const form = render(<DelegationForm onConfirmed={() => {}} />);

    await waitFor(async () => await form.findByTestId('delegate-form-submit'));

    expect(form.queryByTestId('delegate-form-submit')?.getAttribute('disabled')).toEqual('');
    expect(form.queryByTestId('delegate-form-warning')).toBeTruthy();
  });
});

type SetupHooksOptions = {
  isRegistered?: boolean;
  isValidator?: boolean;
  isValidatorGroup?: boolean;
  lockedGoldBalance?: bigint;
  voteSignerForAddress?: string;
};

// Mocks all necessary hooks for the DelegationForm component
const setupHooks = (options?: SetupHooksOptions) => {
  if (options?.voteSignerForAddress && options?.isRegistered === true) {
    throw new Error('Cannot provide voteSignerForAddress for not-registered account');
  }

  vi.spyOn(hooks, 'useBalance').mockReturnValue({
    balance: 0n,
    isError: false,
    isLoading: false,
  } as any);

  vi.spyOn(useDelegatees, 'useDelegatees').mockReturnValue({} as any);
  vi.spyOn(useDelegationBalances, 'useDelegationBalances').mockReturnValue({} as any);

  if (options?.voteSignerForAddress) {
    // First call is for the address itself
    vi.spyOn(hooks, 'useAccountDetails')
      .mockReturnValueOnce({
        isError: false,
        isLoading: false,
        isRegistered: false,
        isValidator: false,
        isValidatorGroup: false,
      } as any)
      // Second for the address the address is signing for
      .mockReturnValueOnce({
        isError: false,
        isLoading: false,
        isRegistered: true,
        isValidator: options?.isValidator === true || false,
        isValidatorGroup: options?.isValidatorGroup === true || false,
      } as any);
  } else {
    vi.spyOn(hooks, 'useAccountDetails').mockReturnValue({
      isError: false,
      isLoading: false,
      isRegistered: options?.isRegistered === true || false,
      isValidator: options?.isValidator === true || false,
      isValidatorGroup: options?.isValidatorGroup === true || false,
    } as any);
  }

  vi.spyOn(hooks, 'useLockedBalance').mockReturnValue({
    lockedBalance: options?.lockedGoldBalance || 0n,
    isLoading: false,
  } as any);

  vi.spyOn(hooks, 'useVoteSignerToAccount').mockReturnValue({
    isLoading: false,
    voteSigner: options?.isRegistered === true ? TEST_ADDRESSES[0] : options?.voteSignerForAddress,
  } as any);
};
