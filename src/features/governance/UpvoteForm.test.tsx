import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('src/utils/useTrackEvent', () => ({
  useTrackEvent: vi.fn(),
}));

vi.mock('src/features/transactions/useTransactionPlan', () => ({
  useTransactionPlan: vi.fn(),
}));

vi.mock('src/features/governance/hooks/useProposalQueue', () => ({
  useProposalQueue: vi.fn(() => ({ queue: [] })),
}));

vi.mock('src/features/governance/hooks/useProposalUpvoters', () => ({
  useProposalUpvoters: vi.fn(() => ({ refetch: vi.fn() })),
}));

vi.mock('src/features/governance/hooks/useVotingStatus', () => ({
  useGovernanceVotingPower: vi.fn(() => ({ votingPower: 1000n })),
  useIsGovernanceUpVoting: vi.fn(() => ({ isUpvoting: false })),
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
import { UpvoteForm } from './UpvoteForm';

const mockTrackEvent = vi.fn();

describe('UpvoteForm Analytics', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent);
    vi.mocked(useTransactionPlan).mockReturnValue({
      getNextTx: vi.fn(),
      onTxSuccess: vi.fn(),
    } as any);
  });

  describe('upvote_completed', () => {
    test('tracks upvote completion with correct properties', () => {
      const mockOnConfirmed = vi.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <UpvoteForm defaultFormValues={{ proposalId: 123 }} onConfirmed={mockOnConfirmed} />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      const mockReceipt = { transactionHash: '0x123' } as any;
      mockPlan.onPlanSuccess?.({ proposalId: 123 }, mockReceipt);

      expect(mockTrackEvent).toHaveBeenCalledWith('upvote_completed', {
        proposalId: 123,
      });
    });

    test('tracks upvote completion for different proposal', () => {
      const mockOnConfirmed = vi.fn();
      render(
        <QueryClientProvider client={queryClient}>
          <UpvoteForm defaultFormValues={{ proposalId: 456 }} onConfirmed={mockOnConfirmed} />
        </QueryClientProvider>,
      );

      const mockPlan = vi.mocked(useTransactionPlan).mock.calls[0][0];
      const mockReceipt = { transactionHash: '0x456' } as any;
      mockPlan.onPlanSuccess?.({ proposalId: 456 }, mockReceipt);

      expect(mockTrackEvent).toHaveBeenCalledWith('upvote_completed', {
        proposalId: 456,
      });
    });
  });
});
