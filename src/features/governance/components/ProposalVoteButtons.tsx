import { SolidButton } from 'src/components/buttons/SolidButton';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { formatNumberString } from 'src/components/numbers/Amount';
import { useGovernanceVotingPower } from 'src/features/governance/hooks/useVotingStatus';
import { VoteType } from 'src/features/governance/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';

export function ProposalUpvoteButton({ proposalId }: { proposalId?: number }) {
  const showTxModal = useTransactionModal(TransactionFlowType.Upvote, { proposalId });

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Upvote</h2>
        <VotingPower />
      </div>
      <SolidButton className="btn-neutral" onClick={() => showTxModal()}>{`➕ Upvote`}</SolidButton>
    </>
  );
}

export function ProposalVoteButtons({ proposalId }: { proposalId?: number }) {
  const showTxModal = useTransactionModal();
  const onClick = (vote: VoteType) => {
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
          className="btn-neutral grow"
          onClick={() => onClick(VoteType.Yes)}
        >{`👍 Yes`}</SolidButton>
        <SolidButton
          className="btn-neutral grow"
          onClick={() => onClick(VoteType.No)}
        >{`👎 No`}</SolidButton>
        <SolidButton
          className="btn-neutral grow"
          onClick={() => onClick(VoteType.Abstain)}
        >{`⚪ Abstain`}</SolidButton>
      </div>
    </>
  );
}

function VotingPower() {
  const { votingPower } = useGovernanceVotingPower();
  return (
    <div className="flex items-center space-x-1.5 text-sm">
      <span>{`Voting power: ${formatNumberString(votingPower)} CELO `}</span>
      <HelpIcon text="Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you" />
    </div>
  );
}
