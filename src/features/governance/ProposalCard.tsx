import Image from 'next/image';
import Link from 'next/link';
import { StackedBarChart } from 'src/components/charts/StackedBarChart';
import {
  ProposalStage,
  ProposalStageToStyle,
  VoteToColor,
  VoteValue,
} from 'src/features/governance/contractTypes';
import { MergedProposalData } from 'src/features/governance/useGovernanceProposals';
import ClockIcon from 'src/images/icons/clock.svg';
import { shortenAddress } from 'src/utils/addresses';
import { fromWei } from 'src/utils/amount';
import { bigIntSum, percent } from 'src/utils/math';
import { toTitleCase, trimToLength } from 'src/utils/strings';
import { getHumanReadableDuration } from 'src/utils/time';

const MIN_VOTE_SUM_FOR_GRAPH = 10000000000000000000n; // 10 CELO

export function ProposalCard({ data }: { data: MergedProposalData }) {
  const { proposal, metadata } = data;

  const { id, expiryTimestamp, votes } = proposal || {};
  const { title, timestampExecuted, cgp } = metadata || {};

  const link = cgp ? `/governance/cgp-${cgp}` : `/governance/${id}`;
  const titleValue = title ? trimToLength(title, 50) : undefined;
  const endTimestamp = timestampExecuted || expiryTimestamp;
  const endTimeValue = endTimestamp ? getHumanReadableDuration(endTimestamp) : undefined;
  const endTimeLabel = timestampExecuted ? 'Executed' : 'Expires';

  const sum = bigIntSum(Object.values(votes || {})) || 1n;
  const barChartData = Object.entries(votes || {}).map(([vote, amount]) => ({
    label: toTitleCase(vote),
    value: fromWei(amount),
    percentage: percent(amount, sum),
    color: VoteToColor[vote as VoteValue],
  }));

  return (
    <Link href={link} className="space-y-2.5">
      <ProposalBadgeRow data={data} />
      {titleValue && <h2 className="text-xl font-medium">{titleValue}</h2>}
      {votes && sum > MIN_VOTE_SUM_FOR_GRAPH && (
        <div className="space-y-2.5">
          <StackedBarChart data={barChartData} showBorder={false} height="h-1" />
          <div className="flex items-center space-x-5">
            {barChartData.map((item, index) => (
              <div key={index} className="flex items-center space-x-1">
                <div style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-full"></div>
                <div className="text-sm font-medium">{`${item.label} ${item.percentage.toFixed(
                  1,
                )}%`}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {endTimeValue && (
        <div className="flex items-center space-x-2">
          <Image src={ClockIcon} alt="" width={16} height={16} />
          <div className="text-sm font-medium">{`${endTimeLabel} ${endTimeValue}`}</div>
        </div>
      )}
    </Link>
  );
}

export function ProposalBadgeRow({
  data,
  showProposer,
}: {
  data: MergedProposalData;
  showProposer?: boolean;
}) {
  const { stage, proposal, metadata } = data;

  const { id, timestamp, proposer } = proposal || {};
  const { timestamp: cgpTimestamp, cgp } = metadata || {};

  const proposedTimestamp = timestamp || cgpTimestamp;
  const proposedTimeValue = proposedTimestamp
    ? new Date(proposedTimestamp).toLocaleDateString()
    : undefined;

  return (
    <div className="flex items-center space-x-3">
      <IdBadge cgp={cgp} id={id} />
      <StageBadge stage={stage} />
      {proposedTimeValue && (
        <div className="text-sm text-taupe-600">{`Proposed ${proposedTimeValue}`}</div>
      )}
      {showProposer && proposer && (
        <>
          <div className="text-xs opacity-50">•</div>
          <div className="text-sm text-taupe-600">{shortenAddress(proposer)}</div>
        </>
      )}
    </div>
  );
}

function IdBadge({ cgp, id }: { cgp?: number; id?: number }) {
  if (!cgp && !id) return null;
  const idValue = cgp ? `CGP ${cgp}` : `# ${id}`;
  return (
    <div className="rounded-full border border-taupe-300 px-2 py-0.5 text-sm font-light">
      {idValue}
    </div>
  );
}

function StageBadge({ stage }: { stage: ProposalStage }) {
  const { color, label } = ProposalStageToStyle[stage];
  return (
    <div
      style={{ backgroundColor: color }}
      className={'rounded-full px-2 py-0.5 text-sm font-light'}
    >
      {label}
    </div>
  );
}
