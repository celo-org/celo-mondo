import clsx from 'clsx';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { formatNumberString } from 'src/components/numbers/Amount';
import {
  useGovernanceVoteRecord,
  useGovernanceVotingPower,
} from 'src/features/governance/hooks/useVotingStatus';
import { VoteAmounts, VoteType } from 'src/features/governance/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { useAccount } from 'wagmi';

export function ProposalUpvoteButton({ proposalId }: { proposalId?: number }) {
  const showTxModal = useTransactionModal(TransactionFlowType.Upvote, { proposalId });

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Upvote</h2>
        <VotingPower />
      </div>
      <SolidButton
        className="btn-neutral w-full"
        onClick={() => showTxModal()}
      >{`➕ Upvote`}</SolidButton>
    </>
  );
}

export function ProposalVoteButtons({ proposalId }: { proposalId?: number }) {
  const { address } = useAccount();
  const { votingRecord } = useGovernanceVoteRecord(address, proposalId);

  const isVoting = (vote: keyof VoteAmounts) => votingRecord && votingRecord[vote] > 0n;

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
          className={clsx('btn-neutral grow', isVoting(VoteType.Yes) && 'bg-purple-500 text-white')}
          onClick={() => onClick(VoteType.Yes)}
        >{`👍 Yes`}</SolidButton>
        <SolidButton
          className={clsx('btn-neutral grow', isVoting(VoteType.No) && 'bg-purple-500 text-white')}
          onClick={() => onClick(VoteType.No)}
        >{`👎 No`}</SolidButton>
        <SolidButton
          className={clsx(
            'btn-neutral grow',
            isVoting(VoteType.Abstain) && 'bg-purple-500 text-white',
          )}
          onClick={() => onClick(VoteType.Abstain)}
        >{`⚪ Abstain`}</SolidButton>
      </div>
    </>
  );
}

function VotingPower() {
  const { address } = useAccount();
  const { votingPower } = useGovernanceVotingPower(address);
  return (
    <div className="flex items-center space-x-1.5 text-sm">
      <span>{`Voting power: ${formatNumberString(votingPower, 2, true)} CELO`}</span>
      <HelpIcon text="Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you" />
    </div>
  );
}
