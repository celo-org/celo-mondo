import Image from 'next/image';
import { StageBadge } from 'src/features/governance/StageBadge';
import { MergedProposalData } from 'src/features/governance/useGovernanceProposals';
import ClockIcon from 'src/images/icons/clock.svg';
import { trimToLength } from 'src/utils/strings';
import { getHumanReadableTimeString } from 'src/utils/time';

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

  return (
    <div className="space-y-2">
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
      {votes && (
        <div className="text-sm text-taupe-600">{`Votes: ${votes.yes} Yes, ${votes.no} No, ${votes.abstain} Abstain`}</div>
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
