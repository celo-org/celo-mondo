import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { StackedBarChart } from 'src/components/charts/StackedBarChart';
import { SocialLogo } from 'src/components/logos/SocialLogo';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { SocialLinkType } from 'src/config/types';
import { StageBadge } from 'src/features/governance/components/StageBadge';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { useProposalVoteTotals } from 'src/features/governance/hooks/useProposalVoteTotals';
import { VoteToColor, VoteType } from 'src/features/governance/types';
import ClockIcon from 'src/images/icons/clock.svg';
import { fromWei } from 'src/utils/amount';
import { bigIntSum, percent } from 'src/utils/math';
import { toTitleCase, trimToLength } from 'src/utils/strings';
import { getEndHumanEndTime } from 'src/utils/time';

const MIN_VOTE_SUM_FOR_GRAPH = 10000000000000000000n; // 10 CELO

export function ProposalCard({
  propData,
  isCompact,
  className,
}: {
  propData: MergedProposalData;
  isCompact?: boolean;
  className?: string;
}) {
  const { id, proposal, metadata } = propData;

  const { expiryTimestamp } = proposal || {};
  const { title, timestampExecuted, cgp } = metadata || {};

  const { votes } = useProposalVoteTotals(propData);

  const link = cgp ? `/governance/cgp-${cgp}` : `/governance/${id}`;
  const titleValue = title ? trimToLength(title, 50) : undefined;
  const endTimeValue = getEndHumanEndTime({ timestampExecuted, expiryTimestamp });

  const sum = bigIntSum(Object.values(votes || {})) || 1n;
  const barChartData = Object.entries(votes || {}).map(([vote, amount]) => ({
    label: toTitleCase(vote),
    value: fromWei(amount),
    percentage: percent(amount, sum),
    color: VoteToColor[vote as VoteType],
  }));

  return (
    <Link href={link} className={clsx('space-y-2.5', className)}>
      <ProposalBadgeRow propData={propData} />
      {titleValue && <h2 className={clsx('font-medium', !isCompact && 'text-lg')}>{titleValue}</h2>}
      {!isCompact && votes && sum > MIN_VOTE_SUM_FOR_GRAPH && (
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
      {!isCompact && endTimeValue && (
        <div className="flex items-center space-x-2">
          <Image src={ClockIcon} alt="" width={16} height={16} />
          <div className="text-sm font-medium">{`${endTimeValue}`}</div>
        </div>
      )}
    </Link>
  );
}

export function ProposalBadgeRow({
  propData,
  showProposer,
  showExecutedTime,
}: {
  propData: MergedProposalData;
  showProposer?: boolean;
  showExecutedTime?: boolean;
}) {
  const { stage, proposal, metadata, id } = propData;

  const { timestamp, proposer, isApproved } = proposal || {};
  const { timestamp: cgpTimestamp, cgp, timestampExecuted } = metadata || {};

  const proposedTimestamp = timestamp || cgpTimestamp;
  const proposedTimeValue = proposedTimestamp
    ? new Date(proposedTimestamp).toLocaleDateString()
    : undefined;
  const executedTimeValue = timestampExecuted
    ? new Date(timestampExecuted).toLocaleDateString()
    : undefined;

  return (
    <div className="flex items-center space-x-2">
      <IdBadge cgp={cgp} />
      <IdBadge id={id} />
      <StageBadge stage={stage} isApproved={isApproved} />
      {proposedTimeValue && (
        <div className="text-sm text-taupe-600">{`Proposed ${proposedTimeValue}`}</div>
      )}
      {showProposer && proposer && (
        <>
          <div className="hidden text-xs opacity-50 sm:block">•</div>
          <ShortAddress
            address={proposer}
            className="hidden font-mono text-sm text-taupe-600 sm:block"
          />
        </>
      )}
      {/* Show one of proposer or executedTimeValue but not both, too crowded */}
      {showExecutedTime && executedTimeValue && !proposer && (
        <>
          <div className="hidden text-xs opacity-50 sm:block">•</div>
          <div className="hidden text-sm text-taupe-600 sm:block">{`Executed ${executedTimeValue}`}</div>
        </>
      )}
    </div>
  );
}

export function ProposalLinkRow({ propData }: { propData: MergedProposalData }) {
  const { proposal, metadata } = propData;
  const discussionUrl = metadata?.url || proposal?.url;
  const cgpUrl = metadata?.cgpUrl;

  if (!discussionUrl) return null;

  const discussionHost = new URL(discussionUrl).hostname;

  return (
    <div className="flex items-center gap-4 pt-2">
      <A_Blank
        href={discussionUrl}
        className="flex grow items-center gap-2 border border-taupe-300 px-3 py-3"
      >
        <SocialLogo type={SocialLinkType.Website} size={18} />
        <span className="grow text-sm font-medium hover:underline">{`View discussion on ${discussionHost}`}</span>
      </A_Blank>
      {cgpUrl && (
        <A_Blank href={cgpUrl} className="border border-taupe-300 px-3 py-3">
          <SocialLogo type={SocialLinkType.Github} size={20} />
        </A_Blank>
      )}
    </div>
  );
}

function IdBadge({ cgp, id }: { cgp?: number; id?: number }) {
  if (!cgp && !id) return null;
  const idValue = cgp ? `CGP ${cgp}` : `# ${id}`;
  return (
    <div className="rounded-full border border-taupe-300 px-2 text-sm font-light">{idValue}</div>
  );
}
