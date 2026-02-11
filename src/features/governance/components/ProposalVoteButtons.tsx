import clsx from 'clsx';
import { useCallback } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { VotingPower } from 'src/features/governance/components/VotingPower';
import { useIsDequeueReady } from 'src/features/governance/hooks/useProposalQueue';
import {
  useGovernanceVoteRecord,
  useStCELOVoteRecord,
} from 'src/features/governance/hooks/useVotingStatus';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { useStakingMode } from 'src/utils/useStakingMode';
import { useTrackEvent } from 'src/utils/useTrackEvent';
import { useAccount } from 'wagmi';

export function ProposalUpvoteButton({ proposalId }: { proposalId?: number }) {
  const { isDequeueReady } = useIsDequeueReady();
  const trackEvent = useTrackEvent();

  const showTxModal = useTransactionModal(TransactionFlowType.Upvote, { proposalId });

  const onUpvoteClick = useCallback(() => {
    if (proposalId) {
      trackEvent('upvote_button_clicked', { proposalId });
    }
    showTxModal();
  }, [proposalId, trackEvent, showTxModal]);

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Upvote</h2>
        <VotingPower />
      </div>
      <SolidButton
        className="btn-neutral w-full"
        onClick={onUpvoteClick}
        disabled={isDequeueReady}
        data-testid="upvote-button"
      >{`➕ Upvote`}</SolidButton>
      {isDequeueReady && (
        <p className="max-w-[20rem] text-xs text-gray-600">
          Upvoting is disabled while there are queued proposals ready for approval.
        </p>
      )}
    </>
  );
}

export function ProposalVoteButtons({ proposalId }: { proposalId?: number }) {
  const { address } = useAccount();
  const { votingRecord } = useGovernanceVoteRecord(address, proposalId);
  const { stCELOVotingRecord } = useStCELOVoteRecord(address, proposalId);
  const { mode } = useStakingMode();
  const trackEvent = useTrackEvent();

  const isVoting = useCallback(
    (vote: keyof VoteAmounts) => {
      switch (mode) {
        case 'CELO':
          return votingRecord && votingRecord[vote] > 0n;
        case 'stCELO':
          return stCELOVotingRecord && stCELOVotingRecord[vote] > 0n;
      }
    },
    [mode, votingRecord, stCELOVotingRecord],
  );

  const showTxModal = useTransactionModal();
  const onClick = (vote: VoteType) => {
    if (proposalId) {
      trackEvent('vote_button_clicked', { proposalId, voteType: vote });
    }
    showTxModal(TransactionFlowType.Vote, { proposalId, vote });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Vote</h2>
        <VotingPower />
      </div>
      <div className="flex items-center justify-between gap-2 md:flex-col md:items-stretch">
        <SolidButton
          className={clsx('btn-neutral grow', isVoting(VoteType.Yes) && 'bg-accent text-white')}
          onClick={() => onClick(VoteType.Yes)}
          data-testid="vote-yes-button"
        >{`👍 Yes`}</SolidButton>
        <SolidButton
          className={clsx('btn-neutral grow', isVoting(VoteType.No) && 'bg-accent text-white')}
          onClick={() => onClick(VoteType.No)}
          data-testid="vote-no-button"
        >{`👎 No`}</SolidButton>
        <SolidButton
          className={clsx('btn-neutral grow', isVoting(VoteType.Abstain) && 'bg-accent text-white')}
          onClick={() => onClick(VoteType.Abstain)}
          data-testid="vote-abstain-button"
        >{`⚪ Abstain`}</SolidButton>
      </div>
    </>
  );
}
