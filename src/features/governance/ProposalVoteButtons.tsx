import { SolidButton } from 'src/components/buttons/SolidButton';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { formatNumberString } from 'src/components/numbers/Amount';
import { useGovernanceVotingPower } from 'src/features/governance/useVotingStatus';

export function ProposalUpvoteButton() {
  // todo tx modal here

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Upvote</h2>
        <VotingPower />
      </div>
      <SolidButton className="btn-neutral">{`👍 Upvote`}</SolidButton>
    </>
  );
}

export function ProposalVoteButtons() {
  // todo tx modal here

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Vote</h2>
        <VotingPower />
      </div>
      <div className="flex items-center justify-between gap-2 md:flex-col md:items-stretch">
        <SolidButton className="btn-neutral">{`👍 Yes`}</SolidButton>
        <SolidButton className="btn-neutral">{`👎 No`}</SolidButton>
        <SolidButton className="btn-neutral">{`⚪ Abstain`}</SolidButton>
      </div>
    </>
  );
}

function VotingPower() {
  const { votingPower } = useGovernanceVotingPower();
  return (
    <div className="flex items-center text-sm">
      {`Voting power: ${formatNumberString(votingPower)} CELO `}
      <HelpIcon text="Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you" />
    </div>
  );
}
