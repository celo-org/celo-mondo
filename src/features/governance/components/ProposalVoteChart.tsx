import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { ColoredChartDataItem, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { formatNumberString } from 'src/components/numbers/Amount';
import { StageBadge } from 'src/features/governance/components/StageBadge';
import { MergedProposalData } from 'src/features/governance/governanceData';
import {
  getMaxThresholdInfo,
  useConstitutionThreshold,
  useIsProposalPassingQuorum,
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
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-baseline gap-1.5">
              <span className="text-sm font-medium">
                {formatNumberString(voteBarChartData[v].value)}
              </span>
              <span className="text-taupe-500 w-[4ch] text-right text-[10px]">
                {voteBarChartData[v].percentage?.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const THRESHOLD_HELP_TEXT =
  'The constitution threshold defines the minimum Yes/(Yes+No) ratio for a proposal to pass. Abstain votes are excluded. Different operations have different thresholds: 60% for low-risk, up to 90% for critical changes like governance parameters.';

export function ProposalVoteRequirements({ propData }: { propData: MergedProposalData }) {
  const isPast = propData.stage > ProposalStage.Referendum;

  return (
    <div className="space-y-3 border-t border-taupe-300 pt-2">
      <h2 className="font-serif text-2xl">Vote Requirements</h2>
      <QuorumBar propData={propData} isPast={isPast} />
      <ThresholdBar propData={propData} isPast={isPast} />
    </div>
  );
}

function QuorumBar({ propData, isPast }: { propData: MergedProposalData; isPast: boolean }) {
  const { votes } = useProposalVoteTotals(propData);
  const { isLoading, quorumMet, quorumVotesRequired } = useIsProposalPassingQuorum(propData);
  const yesVotes = votes?.[VoteType.Yes] || 0n;
  const abstainVotes = votes?.[VoteType.Abstain] || 0n;
  const quorumMeetingVotes = yesVotes + abstainVotes;

  const barData = useMemo(
    () => [
      {
        label: 'Yes Votes',
        value: fromWei(yesVotes),
        percentage: isLoading ? 0 : percent(yesVotes, quorumVotesRequired || 1n),
        color: quorumMet ? Color.Mint : Color.Lilac,
      },
      {
        label: 'Abstain Votes',
        value: fromWei(abstainVotes),
        percentage: isLoading ? 0 : percent(abstainVotes, quorumVotesRequired || 1n),
        color: quorumMet ? Color.Mint : Color.Sand,
      },
    ],
    [yesVotes, isLoading, quorumVotesRequired, quorumMet, abstainVotes],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Quorum</span>
        {!isLoading && <PassFailLabel passing={quorumMet} isPast={isPast} />}
      </div>
      <span className="text-xs text-taupe-600">
        {isLoading
          ? '...loading...'
          : `${formatNumberString(quorumMeetingVotes, 0, true)} Votes of ${formatNumberString(quorumVotesRequired, 0, true)} Required`}
      </span>
      <StackedBarChart data={barData} showBorder={true} height="h-5" className="bg-white" />
    </div>
  );
}

function ThresholdBar({ propData, isPast }: { propData: MergedProposalData; isPast: boolean }) {
  const { votes } = useProposalVoteTotals(propData);
  const { data: thresholds } = useConstitutionThreshold(propData.proposal?.id);
  const thresholdInfo = thresholds ? getMaxThresholdInfo(thresholds) : null;

  const yesVotes = votes?.[VoteType.Yes] || 0n;
  const noVotes = votes?.[VoteType.No] || 0n;
  const totalYesNo = yesVotes + noVotes;
  const yesPct = totalYesNo > 0n ? percent(yesVotes, totalYesNo) : 0;
  const thresholdPct = thresholdInfo ? thresholdInfo.maxThreshold * 100 : 50;
  const isPassing = yesPct >= thresholdPct;

  const barData = useMemo(
    () => [
      {
        label: 'Yes',
        value: yesPct,
        percentage: thresholdPct > 0 ? Math.min((yesPct / thresholdPct) * 100, 100) : 0,
        color: isPassing ? Color.Mint : Color.Lilac,
      },
    ],
    [yesPct, thresholdPct, isPassing],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">Threshold</span>
          <HelpIcon text={THRESHOLD_HELP_TEXT} size={14} type="tooltip" />
        </div>
        {thresholdInfo && <PassFailLabel passing={isPassing} isPast={isPast} />}
      </div>
      <span className="text-xs text-taupe-600">
        {!thresholdInfo
          ? '...loading...'
          : `${yesPct.toFixed(1)}% Yes of ${thresholdInfo.percentage} Required`}
      </span>
      <StackedBarChart data={barData} showBorder={true} height="h-5" className="bg-white" />
    </div>
  );
}

function PassFailLabel({ passing, isPast }: { passing: boolean; isPast: boolean }) {
  return (
    <em className={passing ? 'text-sm text-green-700' : 'text-sm text-red-500'}>
      {passing ? `Pass${tense(isPast)}` : `Fail${tense(isPast)}`}
    </em>
  );
}

function tense(isPast: boolean) {
  return isPast ? 'ed' : 'ing';
}
