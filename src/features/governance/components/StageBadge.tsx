import clsx from 'clsx';
import { ProposalStage, ProposalStageToStyle } from 'src/features/governance/types';

export function StageBadge({ stage, className }: { stage: ProposalStage; className?: string }) {
  const { color, label } = ProposalStageToStyle[stage];
  return (
    <div
      style={{ backgroundColor: color }}
      className={clsx('rounded-full px-2 py-0.5 text-sm font-light', className)}
    >
      {label}
    </div>
  );
}
