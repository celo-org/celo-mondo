import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { ColoredChartDataItem, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { formatNumberString } from 'src/components/numbers/Amount';
import { StageBadge } from 'src/features/governance/components/StageBadge';
import { MergedProposalData } from 'src/features/governance/governanceData';
import {
  useIsProposalPassing,
  useProposalQuorum,
} from 'src/features/governance/hooks/useProposalQuorum';
import {
  useHistoricalProposalVoteTotals,
  useProposalVoteTotals,
} from 'src/features/governance/hooks/useProposalVoteTotals';
import {
  EmptyVoteAmounts,
  ProposalStage,
  VoteAmounts,
  VoteToColor,
  VoteType,
  VoteTypes,
} from 'src/features/governance/types';
import { Color } from 'src/styles/Color';
import { fromWei } from 'src/utils/amount';
import { bigIntSum, percent } from 'src/utils/math';
import { objKeys } from 'src/utils/objects';
import { toTitleCase } from 'src/utils/strings';

export function PastProposalVoteChart({
  id,
  title = 'Votes',
  stage,
}: {
  id: number;
  title?: string;
  stage: ProposalStage;
}) {
  const { isLoading, votes } = useHistoricalProposalVoteTotals(id);

  const totalVotes = bigIntSum(Object.values(votes || {}));

  return (
    <ViewVotes
      votes={votes}
      totalVotes={totalVotes}
      title={title}
      isLoading={isLoading}
      stage={stage}
    />
  );
}

export function ProposalVoteChart({ propData }: { propData: MergedProposalData }) {
  const { isLoading, votes } = useProposalVoteTotals(propData);

  const totalVotes = bigIntSum(Object.values(votes || {}));

  return <ViewVotes votes={votes} totalVotes={totalVotes} isLoading={isLoading} />;
}

function ViewVotes({
  votes,
  title = 'Votes',
  totalVotes,
  isLoading,
  stage,
}: {
  totalVotes: bigint;
  votes: VoteAmounts | undefined;
  title?: string;
  isLoading?: boolean;
  stage?: ProposalStage;
}) {
  const voteBarChartData = useMemo(
    () =>
      objKeys(EmptyVoteAmounts).reduce(
        (acc, v) => {
          acc[v] = {
            label: '',
            value: fromWei(votes?.[v] || 0n),
            percentage: percent(votes?.[v] || 0n, totalVotes || 1n),
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
      <div className="flex flex-row items-center gap-4">
        <h2 className="font-serif text-2xl">{title}</h2>
        {stage && <StageBadge stage={stage} />}
      </div>
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
  const { isLoading, data: quorumRequired } = useProposalQuorum(propData);
  const isPassing = useIsProposalPassing(propData?.proposal?.id);

  const yesVotes = votes?.[VoteType.Yes] || 0n;
  const abstainVotes = votes?.[VoteType.Abstain] || 0n;
  const quorumMeetingVotes = yesVotes + abstainVotes;

  const quorumMetByVoteCount = quorumRequired ? quorumMeetingVotes > quorumRequired : false;
  const quorumBarChartData = useMemo(
    () => [
      {
        label: 'Yes Votes',
        value: fromWei(yesVotes),
        percentage: isLoading ? 0 : percent(yesVotes, quorumRequired || 0n),
        color: isPassing.data || quorumMetByVoteCount ? Color.Mint : Color.Lilac,
      },
      {
        label: 'Abstain Votes',
        value: fromWei(abstainVotes),
        percentage: isLoading ? 0 : percent(abstainVotes, quorumRequired || 1n),
        color: isPassing.data || quorumMetByVoteCount ? Color.Mint : Color.Sand,
      },
    ],
    [quorumMetByVoteCount, yesVotes, quorumRequired, abstainVotes, isLoading, isPassing.data],
  );

  return (
    <div className="space-y-2 border-t border-taupe-300 pt-2">
      <h2 className="font-serif text-2xl">
        Quorum
        <em>
          {isLoading
            ? ''
            : propData.stage > ProposalStage.Referendum
              ? quorumMetByVoteCount
                ? ' — Passed'
                : ' — Failed'
              : isPassing.isSuccess
                ? isPassing.data
                  ? ' — Passing'
                  : ' — Failing'
                : ''}
        </em>
      </h2>
      {isLoading}
      <span className="py-2 text-sm  text-taupe-600">
        {isLoading ? (
          '...loading...'
        ) : (
          <>
            {formatNumberString(quorumMeetingVotes, 0, true)} Votes <em>of</em>&nbsp;&nbsp;
            {formatNumberString(quorumRequired, 0, true)}&nbsp; Required
          </>
        )}
      </span>
      <StackedBarChart
        data={quorumBarChartData}
        showBorder={true}
        height="h-6"
        className="bg-white"
      />
    </div>
  );
}
