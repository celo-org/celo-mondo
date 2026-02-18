import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('src/utils/useTrackEvent', () => ({
  useTrackEvent: vi.fn(),
}));

vi.mock('src/features/transactions/TransactionModal', () => ({
  useTransactionModal: vi.fn(() => vi.fn()),
}));

vi.mock('src/features/governance/hooks/useProposalQueue', () => ({
  useIsDequeueReady: vi.fn(() => ({ isDequeueReady: false })),
}));

vi.mock('src/features/governance/hooks/useVotingStatus', () => ({
  useGovernanceVoteRecord: vi.fn(() => ({ votingRecord: null })),
  useStCELOVoteRecord: vi.fn(() => ({ stCELOVotingRecord: null })),
}));

vi.mock('src/utils/useStakingMode', () => ({
  useStakingMode: vi.fn(() => ({ mode: 'CELO' })),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x123' })),
}));

vi.mock('src/features/governance/components/VotingPower', () => ({
  VotingPower: () => <div>Voting Power</div>,
}));

import { useTrackEvent } from 'src/utils/useTrackEvent';
import { ProposalUpvoteButton, ProposalVoteButtons } from './ProposalVoteButtons';

const mockTrackEvent = vi.fn();

describe('ProposalVoteButtons Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent);
  });

  describe('vote_button_clicked', () => {
    test('tracks yes vote button click', () => {
      render(<ProposalVoteButtons proposalId={123} />);

      fireEvent.click(screen.getByTestId('vote-yes-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('vote_button_clicked', {
        proposalId: 123,
        voteType: 'yes',
      });
    });

    test('tracks no vote button click', () => {
      render(<ProposalVoteButtons proposalId={456} />);

      fireEvent.click(screen.getByTestId('vote-no-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('vote_button_clicked', {
        proposalId: 456,
        voteType: 'no',
      });
    });

    test('tracks abstain vote button click', () => {
      render(<ProposalVoteButtons proposalId={789} />);

      fireEvent.click(screen.getByTestId('vote-abstain-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('vote_button_clicked', {
        proposalId: 789,
        voteType: 'abstain',
      });
    });

    test('does not track when proposalId is undefined', () => {
      render(<ProposalVoteButtons proposalId={undefined} />);

      fireEvent.click(screen.getByTestId('vote-yes-button'));

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('upvote_button_clicked', () => {
    test('tracks upvote button click', () => {
      render(<ProposalUpvoteButton proposalId={123} />);

      fireEvent.click(screen.getByTestId('upvote-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('upvote_button_clicked', {
        proposalId: 123,
      });
    });

    test('does not track when proposalId is undefined', () => {
      render(<ProposalUpvoteButton proposalId={undefined} />);

      fireEvent.click(screen.getByTestId('upvote-button'));

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
