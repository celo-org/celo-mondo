import { useQuery } from '@tanstack/react-query';
import { StaleTime } from 'src/config/consts';
import { ProposalStage } from 'src/features/governance/types';

export function ApprovalBadge({ proposalId, stage }: { proposalId: number; stage: ProposalStage }) {
  const { data: approvalData } = useQuery({
    queryKey: ['proposalApproval', proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/governance/approval/${proposalId}`);
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
        <span>✓</span>
        <span>Passed Technical Approval</span>
      </div>
    );
  }
  if (stage === ProposalStage.Execution || stage === ProposalStage.Referendum) {
    return (
      <div className="inline-flex items-center space-x-1 text-sm text-taupe-600">
        <span>⏳</span>
        <span>Technical Approval Pending</span>
      </div>
    );
  } else if (stage === ProposalStage.Expiration) {
    return (
      <div className="inline-flex items-center space-x-1 text-sm text-taupe-600">
        <span>❌</span>
        <span>Missed Technical Approval</span>
      </div>
    );
  } else {
    return null;
  }
}
