import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { StaleTime } from 'src/config/consts';
import { ProposalStage } from 'src/features/governance/types';

export function ApprovalBadge({
  proposalId,
  stage,
  transactionCount,
}: {
  proposalId: number;
  stage: ProposalStage;
  transactionCount: number | null;
}) {
  const { data: approvalData } = useQuery({
    queryKey: ['proposalApproval', proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/governance/${proposalId}/approval`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        approved: boolean;
        blockNumber?: number;
      }>;
    },
    staleTime: StaleTime.Default,
  });

  if (!approvalData) return null;

  const isOptional = transactionCount === 0;

  if (approvalData.approved) {
    return (
      <StatusPill variant="success">
        {isOptional ? 'Approval Optional (no transactions)' : 'Approval Attained'}
      </StatusPill>
    );
  }
  if (stage === ProposalStage.Execution || stage === ProposalStage.Referendum) {
    return (
      <StatusPill variant={isOptional ? 'neutral' : 'pending'}>
        {isOptional ? 'Approval Optional (no transactions)' : 'Approval Pending'}
      </StatusPill>
    );
  } else if (stage === ProposalStage.Expiration || stage === ProposalStage.Rejected) {
    return <StatusPill variant="neutral">Approval Not Required</StatusPill>;
  } else {
    return null;
  }
}

function StatusPill({
  variant,
  children,
}: {
  variant: 'success' | 'pending' | 'neutral';
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        variant === 'success' && 'bg-green-50 border-green-200 text-green-700',
        variant === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
        variant === 'neutral' && 'border-taupe-300 bg-taupe-100 text-taupe-600',
      )}
    >
      <span className="text-sm leading-none">
        {variant === 'success' && '✅'}
        {variant === 'pending' && '⏳'}
        {variant === 'neutral' && 'ℹ️'}
      </span>
      {children}
    </div>
  );
}
