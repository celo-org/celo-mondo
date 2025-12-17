import { useQuery } from '@tanstack/react-query';
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

  if (approvalData.approved) {
    return (
      <div className="text-jade-600 inline-flex items-center space-x-1 text-sm">
        <span>{transactionCount === 0 ? 'ℹ️' : '✅'}</span>
        <span>
          {transactionCount === 0 ? 'Approval not needed (no transactions)' : 'Approval Attained'}
        </span>
      </div>
    );
  }
  if (stage === ProposalStage.Execution || stage === ProposalStage.Referendum) {
    return (
      <div className="inline-flex items-center space-x-1 text-sm text-taupe-600">
        <span>{transactionCount === 0 ? 'ℹ️' : '⏳'}</span>
        {transactionCount === 0 ? 'Approval not needed (no transactions)' : 'Approval Pending'}
      </div>
    );
  } else if (stage === ProposalStage.Expiration) {
    return (
      <div className="inline-flex items-center space-x-1 text-sm text-taupe-600">
        <span>❌</span>
        <span>Approval Missed</span>
      </div>
    );
  } else {
    return null;
  }
}
