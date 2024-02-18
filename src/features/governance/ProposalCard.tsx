import BigNumber from 'bignumber.js';
import Image from 'next/image';
import { StackedBarChart } from 'src/components/charts/StackedBarChart';
import { StageBadge } from 'src/features/governance/StageBadge';
import { VoteToColor, VoteValue } from 'src/features/governance/contractTypes';
import { MergedProposalData } from 'src/features/governance/useGovernanceProposals';
import ClockIcon from 'src/images/icons/clock.svg';
import { fromWei } from 'src/utils/amount';
import { bigIntSum } from 'src/utils/math';
import { toTitleCase, trimToLength } from 'src/utils/strings';
import { getHumanReadableTimeString } from 'src/utils/time';

const MIN_VOTE_SUM_FOR_GRAPH = 10000000000000000000n; // 10 CELO

export function ProposalCard({ data }: { data: MergedProposalData }) {
  const { stage, proposal, metadata } = data;

  const { id, timestamp, expiryTimestamp, votes } = proposal || {};
  const { title, timestamp: cgpTimestamp, timestampExecuted, cgp } = metadata || {};

  const idValue = id ? `# ${id}` : cgp ? `CGP ${cgp}` : undefined;
  const titleValue = title ? trimToLength(title, 50) : undefined;
  const proposedTimestamp = timestamp || cgpTimestamp;
  const proposedTimeValue = proposedTimestamp
    ? new Date(proposedTimestamp).toLocaleDateString()
    : undefined;
  const endTimestamp = timestampExecuted || expiryTimestamp;
  const endTimeValue = endTimestamp ? getHumanReadableTimeString(endTimestamp) : undefined;
  const endTimeLabel = timestampExecuted ? 'Executed' : 'Expires';

  const sum = bigIntSum(Object.values(votes || {})) || 1n;
  const barChartData = Object.entries(votes || {}).map(([vote, amount]) => ({
    label: toTitleCase(vote),
    value: fromWei(amount),
    percentage: BigNumber(amount.toString()).div(sum.toString()).times(100).toNumber(),
    color: VoteToColor[vote as VoteValue],
  }));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center space-x-3">
        {idValue && (
          <div className="rounded-full border border-taupe-300 px-2 py-0.5 text-sm font-light">
            {idValue}
          </div>
        )}
        <StageBadge stage={stage} />
        {proposedTimeValue && (
          <div className="text-sm text-taupe-600">{`Proposed ${proposedTimeValue}`}</div>
        )}
      </div>
      {titleValue && <h3 className="text-xl font-medium">{titleValue}</h3>}
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
    </div>
  );
}
