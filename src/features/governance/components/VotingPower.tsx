import { HelpIcon } from 'src/components/icons/HelpIcon';
import { formatNumberString } from 'src/components/numbers/Amount';
import { useGovernanceVotingPower } from 'src/features/governance/hooks/useVotingStatus';
import { useAccount } from 'wagmi';

export function VotingPower() {
  const { address } = useAccount();
  const { votingPower } = useGovernanceVotingPower(address);
  return (
    <div className="flex items-center space-x-1.5 pt-1 text-sm">
      <span>{`Voting power: ${formatNumberString(votingPower, 2, true)} CELO`}</span>
      <HelpIcon text="Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you" />
    </div>
  );
}
