import { HelpIcon } from 'src/components/icons/HelpIcon';
import { formatNumberString } from 'src/components/numbers/Amount';
import {
  useGovernanceVotingPower,
  useStCELOVotingPower,
} from 'src/features/governance/hooks/useVotingStatus';
import { useStakingMode } from 'src/utils/useStakingMode';
import { useAccount } from 'wagmi';

export function VotingPower() {
  const { address } = useAccount();
  const { mode } = useStakingMode();
  const { votingPower } = useGovernanceVotingPower(address);
  const { stCeloVotingPower } = useStCELOVotingPower(address);
  const _votingPower = mode === 'CELO' ? votingPower : stCeloVotingPower;

  const text =
    mode === 'CELO'
      ? 'Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you'
      : 'Voting power is the translated amount of that your current stCELO balance into CELO, using the exchange rate on the stCELO contract.';

  return (
    <div className="flex items-center space-x-1.5 pt-1 text-sm">
      <span>{`Voting power: ${formatNumberString(_votingPower, 2, true)} CELO`}</span>
      <HelpIcon text={text} />
    </div>
  );
}
