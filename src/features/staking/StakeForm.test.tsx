import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ONE_ADDRESS } from 'src/config/consts';
import { StakeActionType } from 'src/features/staking/types';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('src/utils/useTrackEvent', () => ({
  useTrackEvent: vi.fn(),
}));

vi.mock('src/features/transactions/useTransactionPlan', () => ({
  useTransactionPlan: vi.fn(),
}));

vi.mock('src/features/account/hooks', () => ({
  useVoteSignerToAccount: vi.fn(() => ({ isLoading: false, signingFor: null })),
}));

vi.mock('src/features/locking/useLockedStatus', () => ({
  useLockedStatus: vi.fn(() => ({ lockedBalances: undefined })),
}));

vi.mock('src/features/staking/useStakingBalances', () => ({
  useStakingBalances: vi.fn(() => ({
    stakeBalances: undefined,
    groupToStake: undefined,
    refetch: vi.fn(),
  })),
}));

vi.mock('src/features/delegation/hooks/useDelegationBalances', () => ({
  useDelegationBalances: vi.fn(() => ({ delegations: undefined })),
}));

vi.mock('src/features/validators/useValidatorGroups', () => ({
  useValidatorGroups: vi.fn(() => ({
    groups: [],
    addressToGroup: {
      '0xE09632da4dEAFb3DA2Cd6939F31c98607fCCdBC5': {
        address: '0xE09632da4dEAFb3DA2Cd6939F31c98607fCCdBC5',
        name: 'cLabs',
        members: {},
        eligible: true,
        capacity: 1000000n,
        votes: 500000n,
        score: 0.8,
        lastSlashed: null,
        url: '',
      },
    },
  })),
}));

vi.mock('src/features/staking/autoActivation', () => ({
  submitStakeActivationRequest: vi.fn(),
}));

vi.mock('src/features/transactions/useWriteContractWithReceipt', () => ({
  useWriteContractWithReceipt: vi.fn(() => ({ writeContract: vi.fn(), isLoading: false })),
}));

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>();
  return {
    ...actual,
    useAccount: vi.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
    usePublicClient: vi.fn(() => ({})),
  };
});

import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useTrackEvent } from 'src/utils/useTrackEvent';
import { StakeForm } from './StakeForm';

const mockTrackEvent = vi.fn();

describe('StakeForm Analytics', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent);
    vi.mocked(useTransactionPlan).mockReturnValue({
      getNextTx: vi.fn(),
      isPlanStarted: false,
      txPlanIndex: 0,
      numTxs: 1,
      onTxSuccess: vi.fn(),
    } as any);
  });

  describe('stake_completed', () => {
    test('tracks group address not group name', () => {
      const groupAddress = '0xE09632da4dEAFb3DA2Cd6939F31c98607fCCdBC5';

      render(
        <QueryClientProvider client={queryClient}>
          <StakeForm defaultFormValues={{ group: groupAddress }} onConfirmed={vi.fn()} />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      const mockReceipt = { transactionHash: '0xabc' } as any;
      mockPlan.onPlanSuccess?.(
        { action: StakeActionType.Stake, amount: 10, group: groupAddress, delegate: false },
        mockReceipt,
      );

      expect(mockTrackEvent).toHaveBeenCalledWith('stake_completed', {
        action: StakeActionType.Stake,
        amount: 10,
        group: groupAddress,
      });
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'stake_completed',
        expect.objectContaining({
          group: 'cLabs',
        }),
      );
    });

    test('tracks unstake with group address', () => {
      const groupAddress = '0xE09632da4dEAFb3DA2Cd6939F31c98607fCCdBC5';

      render(
        <QueryClientProvider client={queryClient}>
          <StakeForm
            defaultFormValues={{ group: groupAddress, action: StakeActionType.Unstake }}
            onConfirmed={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      const mockReceipt = { transactionHash: '0xdef' } as any;
      mockPlan.onPlanSuccess?.(
        { action: StakeActionType.Unstake, amount: 5, group: groupAddress, delegate: false },
        mockReceipt,
      );

      expect(mockTrackEvent).toHaveBeenCalledWith('stake_completed', {
        action: StakeActionType.Unstake,
        amount: 5,
        group: groupAddress,
      });
    });

    test('tracked group value passes schema validation', () => {
      const groupAddress = ONE_ADDRESS;

      render(
        <QueryClientProvider client={queryClient}>
          <StakeForm onConfirmed={vi.fn()} />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      mockPlan.onPlanSuccess?.(
        { action: StakeActionType.Stake, amount: 1, group: groupAddress, delegate: false },
        { transactionHash: '0x111' } as any,
      );

      const [, props] = mockTrackEvent.mock.calls[0];
      expect(props.group).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });
});
