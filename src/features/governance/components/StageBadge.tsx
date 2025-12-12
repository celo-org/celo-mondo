import clsx from 'clsx';
import { ProposalStage } from 'src/features/governance/types';
import { Color } from 'src/styles/Color';

export function StageBadge({ stage, className }: { stage: ProposalStage; className?: string }) {
  const { color, label } = getProposalStageStyle(stage);
  return (
    <div
      style={{ backgroundColor: color }}
      className={clsx('whitespace-nowrap rounded-full px-2 py-0.5 text-sm font-light', className)}
    >
      {label}
    </div>
  );
}

const ProposalStageToBgClass: Record<ProposalStage, { color: string; label: string }> = {
  [ProposalStage.None]: { color: Color.Sky, label: 'Draft' },
  [ProposalStage.Queued]: { color: Color.Lavender, label: 'Upvoting' },
  [ProposalStage.Referendum]: { color: Color.Lavender, label: 'Voting' },
  // Approval stage is never used
  [ProposalStage.Approval]: { color: Color.Lavender, label: 'Approval' },
  [ProposalStage.Execution]: { color: Color.Lavender, label: 'Execution' },
  [ProposalStage.Expiration]: { color: Color.Red, label: 'Expired' },
  [ProposalStage.Executed]: { color: Color.Jade, label: 'Executed' },
  [ProposalStage.Adopted]: { color: Color.Jade, label: 'Adopted' },
  [ProposalStage.Withdrawn]: { color: Color.Red, label: 'Withdrawn' },
  [ProposalStage.Rejected]: { color: Color.Red, label: 'Rejected' },
};

function getProposalStageStyle(stage: ProposalStage, isApproved?: boolean) {
  const result = ProposalStageToBgClass[stage];
  if (stage === ProposalStage.Execution && !isApproved) {
    return { ...result, label: 'Approval Pending' };
  } else {
    return result;
  }
}
