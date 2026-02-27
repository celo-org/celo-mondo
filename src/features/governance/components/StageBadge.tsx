import clsx from 'clsx';
import { ProposalStage } from 'src/features/governance/types';
import { Color } from 'src/styles/Color';

export function StageBadge({ stage, className }: { stage: ProposalStage; className?: string }) {
  const { color, label, textWhite } = getProposalStageStyle(stage);
  return (
    <div
      style={{ backgroundColor: color }}
      className={clsx(
        'whitespace-nowrap rounded-full px-2 py-0.5 text-sm font-light',
        textWhite && 'text-white',
        className,
      )}
    >
      {label}
    </div>
  );
}

const ProposalStageToBgClass: Record<
  ProposalStage,
  { color: string; label: string; textWhite?: boolean }
> = {
  [ProposalStage.None]: { color: Color.Sky, label: 'Draft' },
  [ProposalStage.Queued]: { color: Color.Lavender, label: 'Upvoting', textWhite: true },
  [ProposalStage.Referendum]: { color: Color.Lavender, label: 'Voting', textWhite: true },
  // Approval stage is never used
  [ProposalStage.Approval]: { color: Color.Lavender, label: 'Approval', textWhite: true },
  [ProposalStage.Execution]: { color: Color.Lavender, label: 'Execution', textWhite: true },
  [ProposalStage.Expiration]: { color: Color.Red, label: 'Expired' },
  [ProposalStage.Executed]: { color: Color.Jade, label: 'Executed' },
  [ProposalStage.Adopted]: { color: Color.Jade, label: 'Adopted' },
  [ProposalStage.Withdrawn]: { color: Color.Red, label: 'Withdrawn' },
  [ProposalStage.Rejected]: { color: Color.Red, label: 'Rejected' },
};

function getProposalStageStyle(stage: ProposalStage, _isApproved?: boolean) {
  const result = ProposalStageToBgClass[stage];
  return result;
}
