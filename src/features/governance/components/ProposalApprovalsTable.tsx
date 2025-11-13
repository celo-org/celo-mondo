import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { Identicon } from 'src/components/icons/Identicon';
import { Collapse } from 'src/components/menus/Collapse';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { ApprovalBadge } from 'src/features/governance/components/ApprovalBadge';
import { useProposalApprovers } from 'src/features/governance/hooks/useProposalApprovers';
import { ProposalStage } from 'src/features/governance/types';
import { Address } from 'viem';

export function ProposalApprovalsTable({
  proposalId,
  stage,
}: {
  proposalId: number;
  stage: ProposalStage;
}) {
  const { isLoading, confirmedBy, requiredConfirmationsCount } = useProposalApprovers(proposalId);
  const fraction =
    !isLoading && confirmedBy?.length
      ? `${confirmedBy.length} / ${requiredConfirmationsCount}`
      : null;
  return (
    <div className="hidden md:block">
      <Collapse
        button={
          <h2 className="text-left font-serif text-2xl">
            Technical Approvals
            <span className="pl-4 text-sm text-taupe-600">{fraction}</span>
          </h2>
        }
        buttonClasses="w-full"
        defaultOpen={true}
      >
        <div className="flex content-center justify-center p-2 text-center">
          <ApprovalBadge proposalId={proposalId} stage={stage} />
        </div>
        {confirmedBy?.length ? (
          <ConfirmationsTable isLoading={isLoading} confirmations={confirmedBy} />
        ) : null}
      </Collapse>
    </div>
  );
}
// Approvals are fetched from onchain therefore only can be displayed in Execution and Referendum Stages.
function ConfirmationsTable({
  isLoading,
  confirmations,
}: {
  isLoading: boolean;
  confirmations: readonly Address[];
}) {
  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading Approvers
      </SpinnerWithLabel>
    );
  }
  return (
    <table>
      <tbody>
        {confirmations.map((approver) => (
          <tr key={approver}>
            <td className="py-2">
              <Identicon address={approver} size={20} />
            </td>
            <td className="px-4 py-2 text-sm">
              <ShortAddress address={approver} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
