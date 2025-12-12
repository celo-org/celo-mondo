import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import * as hooks from 'src/features/account/hooks';
import { DelegationForm } from 'src/features/delegation/DelegationForm';
import * as useDelegatees from 'src/features/delegation/hooks/useDelegatees';
import * as useValidatorGroups from 'src/features/validators/useValidatorGroups';

import * as useDelegationBalances from 'src/features/delegation/hooks/useDelegationBalances';
import * as useGovernanceProposals from 'src/features/governance/hooks/useGovernanceProposals';
import * as votingHooks from 'src/features/governance/hooks/useVotingStatus';
import { VoteForm } from 'src/features/governance/VoteForm';
import * as useLockedStatus from 'src/features/locking/useLockedStatus';
import { StakeForm } from 'src/features/staking/StakeForm';
import * as useStakingBalances from 'src/features/staking/useStakingBalances';
import { TransactionFlow } from 'src/features/transactions/TransactionFlow';
import * as useWriteContractWithReceipt from 'src/features/transactions/useWriteContractWithReceipt';
import { TEST_ADDRESSES } from 'src/test/anvil/constants';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as wagmi from 'wagmi';

// Otherwise the tests will fail with "cannot redeclare useAccount" error
vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

// Helper to wrap components with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

describe('<TransactionFlow />', () => {
  beforeEach(async () => {
    vi.spyOn(wagmi, 'useAccount').mockReturnValue({
      isLoading: false,
      address: TEST_ADDRESSES[0],
    } as any);
    vi.spyOn(wagmi, 'useReadContract').mockRejectedValue({ data: undefined });
    vi.spyOn(useWriteContractWithReceipt, 'useWriteContractWithReceipt').mockReturnValue({} as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('<DelegationForm />', () => {
    test('renders <AccountRegisterForm /> for not registered account', async () => {
      setupHooks();

      const flow = render(
        <TransactionFlow
          header="Test header"
          FormComponent={DelegationForm}
          closeModal={() => {}}
        />,
        { wrapper: createWrapper() },
      );

      await waitFor(async () => expect(await flow.findByTestId('register-form')).toBeTruthy());
    });

    describe('as a regular account', () => {
      test('renders <LockForm /> for account with no locked balance', async () => {
        setupHooks({ isRegistered: true });

        const flow = render(
          <TransactionFlow
            header="Test header"
            FormComponent={DelegationForm}
            closeModal={() => {}}
          />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => {
          expect(await flow.findByTestId('lock-form')).toBeTruthy();
        });
      });

      test('renders <DelegationForm /> for account with some locked balance', async () => {
        setupHooks({ isRegistered: true, lockedGoldBalance: 1n });

        const flow = render(
          <TransactionFlow
            header="Test header"
            FormComponent={DelegationForm}
            closeModal={() => {}}
          />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('delegate-form')).toBeTruthy());
      });
    });

    describe('as a vote signer', () => {
      test('renders <DelegationForm /> even though the account is not registered and does not have any locked Celo on its own', async () => {
        setupHooks({ voteSignerForAddress: TEST_ADDRESSES[1] });

        const flow = render(
          <TransactionFlow
            header="Test header"
            FormComponent={DelegationForm}
            closeModal={() => {}}
          />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('delegate-form')).toBeTruthy());
      });
    });
  });

  describe('<VoteForm />', () => {
    test('renders <AccountRegisterForm /> for not registered account', async () => {
      setupHooks();

      const flow = render(
        <TransactionFlow header="Test header" FormComponent={VoteForm} closeModal={() => {}} />,
        { wrapper: createWrapper() },
      );

      await waitFor(async () => expect(await flow.findByTestId('register-form')).toBeTruthy());
    });

    describe('as a regular account', () => {
      test('renders <LockForm /> for account with no locked balance', async () => {
        setupHooks({ isRegistered: true });

        const flow = render(
          <TransactionFlow header="Test header" FormComponent={VoteForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => {
          expect(await flow.findByTestId('lock-form')).toBeTruthy();
        });
      });

      test('renders <VoteForm /> for account with some locked balance', async () => {
        setupHooks({ isRegistered: true, lockedGoldBalance: 1n });

        const flow = render(
          <TransactionFlow header="Test header" FormComponent={VoteForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('vote-form')).toBeTruthy());
      });
    });

    describe('as a vote signer', () => {
      // Should not make "an exception" for any other form type than delegation
      // although in the future we should allow it
      test('renders <VoteForm />', async () => {
        setupHooks({ voteSignerForAddress: TEST_ADDRESSES[1] });

        const flow = render(
          <TransactionFlow header="Test header" FormComponent={VoteForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('vote-form')).toBeTruthy());
      });
    });
    describe('as a account which has been delegated votes', () => {
      test('renders <VoteForm /> for account', async () => {
        setupHooks({ isRegistered: true, lockedGoldBalance: 0n, votingPower: 1n });

        const flow = render(
          <TransactionFlow header="Test header" FormComponent={VoteForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('vote-form')).toBeTruthy());
      });
    });
  });

  describe('<StakeForm/>', () => {
    describe('for registered account', () => {
      test('renders <LockForm /> for account with no locked balance', async () => {
        setupHooks({ isRegistered: true });

        const flow = render(
          <TransactionFlow header="Test header" FormComponent={StakeForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => {
          expect(await flow.findByTestId('lock-form')).toBeTruthy();
        });
      });

      test('renders <StakeForm /> for account with some locked balance', async () => {
        setupHooks({ isRegistered: true, lockedGoldBalance: 1n });

        const flow = render(
          <TransactionFlow header="Election" FormComponent={StakeForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('stake-form')).toBeTruthy());
      });
    });
    describe('for voteSigner', () => {
      test('renders <StakeForm /> for account with some locked balance', async () => {
        setupHooks({
          isRegistered: false,
          lockedGoldBalance: 0n,
          votingPower: 2n,
          voteSignerForAddress: TEST_ADDRESSES[1],
        });

        const flow = render(
          <TransactionFlow header="Election" FormComponent={StakeForm} closeModal={() => {}} />,
          { wrapper: createWrapper() },
        );

        await waitFor(async () => expect(await flow.findByTestId('stake-form')).toBeTruthy());
      });
    });
  });
});

type SetupHooksOptions = {
  isRegistered?: boolean;
  lockedGoldBalance?: bigint;
  voteSignerForAddress?: string;
  votingPower?: bigint;
};

// Mocks all necessary hooks for the TransactionFlow component
// including all the components that are used in the flow
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
  vi.spyOn(useLockedStatus, 'useLockedStatus').mockReturnValue({} as any);
  vi.spyOn(useStakingBalances, 'useStakingBalances').mockReturnValue({} as any);
  vi.spyOn(useGovernanceProposals, 'useGovernanceProposals').mockReturnValue({} as any);
  vi.spyOn(useGovernanceProposals, 'useGovernanceProposal').mockReturnValue({} as any);
  vi.spyOn(useValidatorGroups, 'useValidatorGroups').mockReturnValue({} as any);

  vi.spyOn(votingHooks, 'useGovernanceVotingPower').mockReturnValue({
    isLoading: false,
    votingPower: options?.votingPower ?? 0n,
    isError: false,
  });

  vi.spyOn(votingHooks, 'useStCELOVoteRecord').mockReturnValue({
    isLoading: false,
    data: undefined,
    isError: false,
    refetch: vi.fn(),
  } as any);

  vi.spyOn(hooks, 'useAccountDetails').mockReturnValue({
    isError: false,
    isLoading: false,
    isRegistered: options?.isRegistered === true || false,
  } as any);

  vi.spyOn(hooks, 'useIsAccount').mockReturnValue({
    isError: false,
    isLoading: false,
    data: options?.isRegistered === true || false,
  } as any);

  vi.spyOn(hooks, 'useLockedBalance').mockReturnValue({
    lockedBalance: options?.lockedGoldBalance || 0n,
    isLoading: false,
  } as any);

  vi.spyOn(hooks, 'useVoteSignerToAccount').mockReturnValue({
    isLoading: false,
    signingFor: options?.isRegistered === true ? TEST_ADDRESSES[0] : options?.voteSignerForAddress,
  } as any);
};
