import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
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

vi.mock('src/features/governance/hooks/useProposalQueue', () => ({
  useProposalDequeue: vi.fn(() => ({ dequeue: [] })),
}));

vi.mock('src/features/governance/hooks/useVotingStatus', () => ({
  useGovernanceVoteRecord: vi.fn(() => ({ refetch: vi.fn() })),
  useGovernanceVotingPower: vi.fn(() => ({ votingPower: 1000n })),
  useStCELOVoteRecord: vi.fn(() => ({ refetch: vi.fn() })),
  useStCELOVotingPower: vi.fn(() => ({ stCeloVotingPower: 1000n })),
}));

vi.mock('src/utils/useStakingMode', () => ({
  useStakingMode: vi.fn(() => ({ mode: 'CELO' })),
}));

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>();
  return {
    ...actual,
    useAccount: vi.fn(() => ({ address: '0x123' })),
    usePublicClient: vi.fn(() => ({})),
  };
});

vi.mock('src/features/transactions/useWriteContractWithReceipt', () => ({
  useWriteContractWithReceipt: vi.fn(() => ({ writeContract: vi.fn(), isLoading: false })),
}));

import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useTrackEvent } from 'src/utils/useTrackEvent';
import { VoteForm } from './VoteForm';

const mockTrackEvent = vi.fn();
const mockOnPlanSuccess = vi.fn();

describe('VoteForm Analytics', () => {
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
      onTxSuccess: vi.fn(),
      onPlanSuccess: mockOnPlanSuccess,
    } as any);
  });

  describe('vote_completed', () => {
    test('tracks vote completion with correct properties', () => {
      const mockOnConfirmed = vi.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <VoteForm defaultFormValues={{ proposalId: 123 }} onConfirmed={mockOnConfirmed} />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      const mockReceipt = { transactionHash: '0x123' } as any;
      mockPlan.onPlanSuccess?.({ vote: 'yes', proposalId: 123 }, mockReceipt);

      expect(mockTrackEvent).toHaveBeenCalledWith('vote_completed', {
        voteType: 'yes',
        proposalId: 123,
      });
    });

    test('tracks different vote types', () => {
      const mockOnConfirmed = vi.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <VoteForm defaultFormValues={{ proposalId: 456 }} onConfirmed={mockOnConfirmed} />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      const mockReceipt = { transactionHash: '0x456' } as any;
      mockPlan.onPlanSuccess?.({ vote: 'no', proposalId: 456 }, mockReceipt);

      expect(mockTrackEvent).toHaveBeenCalledWith('vote_completed', {
        voteType: 'no',
        proposalId: 456,
      });
    });
  });
});
