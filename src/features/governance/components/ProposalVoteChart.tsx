import { useMemo, useState } from 'react';
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
  const { isLoading, quorumMet, quorumVotesRequired } = useIsProposalPassingQuorum(propData);
  const yesVotes = votes?.[VoteType.Yes] || 0n;
  const abstainVotes = votes?.[VoteType.Abstain] || 0n;
  const quorumMeetingVotes = yesVotes + abstainVotes;

  const quorumBarChartData = useMemo(
    () => [
      {
        label: 'Yes Votes',
        value: fromWei(yesVotes),
        percentage: isLoading ? 0 : percent(yesVotes, quorumVotesRequired || 0n),
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

  const isPastVotingStage = propData.stage > ProposalStage.Referendum;

  return (
    <div className="space-y-2 border-t border-taupe-300 pt-2">
      <h2 className="font-serif text-2xl">
        Quorum
        <em>
          {isLoading
            ? ''
            : quorumMet
              ? ` — Pass${tense(isPastVotingStage)}`
              : ` — Fail${tense(isPastVotingStage)}`}
        </em>
      </h2>
      {isLoading}
      <span className="py-2 text-sm  text-taupe-600">
        {isLoading ? (
          '...loading...'
        ) : (
          <>
            {formatNumberString(quorumMeetingVotes, 0, true)} Votes <em>of</em>&nbsp;&nbsp;
            {formatNumberString(quorumVotesRequired, 0, true)}&nbsp; Required
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

const CONSTITUTION_HELP_TEXT =
  'The constitution defines the minimum Yes/(Yes+No) ratio for a proposal to pass. Abstain votes are excluded. For example, if a proposal requires 60% and has 80 Yes and 20 No votes, it passes with 80%. Different operations have different thresholds: 60% for low-risk, up to 90% for critical changes like governance parameters.';

export function ProposalConstitutionChart({ propData }: { propData: MergedProposalData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { votes } = useProposalVoteTotals(propData);
  const { data: thresholds } = useConstitutionThreshold(propData.proposal?.id);
  const thresholdInfo = thresholds ? getMaxThresholdInfo(thresholds) : null;

  const yesVotes = votes?.[VoteType.Yes] || 0n;
  const noVotes = votes?.[VoteType.No] || 0n;
  const totalYesNo = yesVotes + noVotes;
  const yesPct = totalYesNo > 0n ? percent(yesVotes, totalYesNo) : 0;
  const thresholdPct = thresholdInfo ? thresholdInfo.maxThreshold * 100 : 50;
  const isPassing = yesPct >= thresholdPct;
  const isPastVotingStage = propData.stage > ProposalStage.Referendum;

  const barChartData = useMemo(
    () => [
      {
        label: 'Yes',
        value: yesPct,
        percentage: thresholdPct > 0 ? (yesPct / thresholdPct) * 100 : 0,
        color: isPassing ? Color.Mint : Color.Lilac,
      },
    ],
    [yesPct, thresholdPct, isPassing],
  );

  if (!thresholdInfo) return null;

  return (
    <div className="border-t border-taupe-300 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-taupe-600">
            Constitution{' '}
            <em>
              {isPassing
                ? `— Pass${tense(isPastVotingStage)}`
                : `— Fail${tense(isPastVotingStage)}`}
            </em>
          </span>
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: isPassing ? Color.Mint : Color.Red }}
          />
        </div>
        <span className="text-xs text-taupe-600">{isExpanded ? '-' : '+'}</span>
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-taupe-600">
              {yesPct.toFixed(0)}% Yes <em>of</em>&nbsp;&nbsp;{thresholdInfo.percentage}&nbsp;
              Required
            </span>
            <HelpIcon text={CONSTITUTION_HELP_TEXT} size={14} />
          </div>
          <StackedBarChart
            data={barChartData}
            showBorder={true}
            height="h-6"
            className="bg-white"
          />
        </div>
      )}
    </div>
  );
}

function tense(isPast: boolean) {
  return isPast ? 'ed' : 'ing';
}
