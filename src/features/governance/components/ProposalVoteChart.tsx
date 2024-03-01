import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { ColoredChartDataItem, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import { MergedProposalData } from 'src/features/governance/hooks/useGovernanceProposals';
import { useProposalQuorum } from 'src/features/governance/hooks/useProposalQuorum';
import { useProposalVoteTotals } from 'src/features/governance/hooks/useProposalVoteTotals';
import { EmptyVoteAmounts, VoteToColor, VoteType, VoteTypes } from 'src/features/governance/types';
import { Color } from 'src/styles/Color';
import { fromWei } from 'src/utils/amount';
import { bigIntSum, percent } from 'src/utils/math';
import { objKeys } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';

export function ProposalVoteChart({ propData }: { propData: MergedProposalData }) {
  const { isLoading, votes } = useProposalVoteTotals(propData);

  const totalVotes = bigIntSum(Object.values(votes || {}));

  const voteBarChartData = useMemo(
    () =>
      objKeys(EmptyVoteAmounts).reduce(
        (acc, v) => {
          acc[v] = {
            label: '',
            value: fromWei(votes?.[v] || 0n),
            percentage: percent(votes?.[v] || 0n, totalVotes),
            color: VoteToColor[v],
          };
          return acc;
        },
        {} as Record<VoteType, ColoredChartDataItem>,
      ),
    [votes, totalVotes],
  );

  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading votes
      </SpinnerWithLabel>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-serif text-2xl">Result</h2>
      <div className="space-y-1.5">
        {Object.values(VoteTypes).map((v) => (
          <div key={v} className="relative text-xs">
            <StackedBarChart data={[voteBarChartData[v]]} showBorder={false} height="h-7" />
            <span className="absolute left-2 top-1/2 -translate-y-1/2">{toTitleCase(v)}</span>
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <span className="text-gray-500">{formatNumberString(voteBarChartData[v].value)}</span>
              <span>{voteBarChartData[v].percentage?.toFixed(0) + '%'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProposalQuorumChart({ propData }: { propData: MergedProposalData }) {
  const { votes } = useProposalVoteTotals(propData);
  const quorumRequired = useProposalQuorum(propData);

  const yesVotes = votes?.[VoteType.Yes] || 0n;

  const quorumBarChartData = useMemo(
    () => [
      {
        label: 'Yes votes',
        value: fromWei(yesVotes),
        percentage: percent(yesVotes, quorumRequired || 1n),
        color: Color.Wood,
      },
    ],
    [yesVotes, quorumRequired],
  );

  return (
    <div className="space-y-2 border-t border-taupe-300 pt-2">
      <Amount valueWei={yesVotes} className="text-2xl" decimals={0} />
      <StackedBarChart data={quorumBarChartData} showBorder={false} className="bg-taupe-300" />
      <div className="flex items-center text-sm text-taupe-600">
        {`Quorum required: ${formatNumberString(quorumRequired, 0, true)} CELO`}
      </div>
    </div>
  );
}
