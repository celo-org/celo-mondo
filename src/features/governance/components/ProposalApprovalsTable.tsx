import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { Identicon } from 'src/components/icons/Identicon';
import { Collapse } from 'src/components/menus/Collapse';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { useProposalApprovers } from 'src/features/governance/hooks/useProposalApprovers';
import { Address } from 'viem';

export function ProposalApprovalsTable({ proposalId }: { proposalId: number }) {
  const {
    isLoading,
    confirmedBy: confirmations,
    requiredConfirmationsCount: required,
  } = useProposalApprovers(proposalId);
  const fraction = isLoading ? '? / 3' : `${confirmations?.length || 0} / ${required}`;
  return (
    <div className="hidden md:block">
      <Collapse
        button={
          <h2 className="text-left font-serif text-2xl">
            Approved By
            <span className="pl-4 text-sm text-taupe-600">{fraction}</span>
          </h2>
        }
        buttonClasses="w-full"
        defaultOpen={true}
      >
        <ConfirmationsTable isLoading={isLoading} confirmations={confirmations} />
      </Collapse>
    </div>
  );
}

function ConfirmationsTable({
  isLoading,
  confirmations,
}: {
  isLoading: boolean;
  confirmations: readonly Address[] | undefined;
}) {
  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading Approvers
      </SpinnerWithLabel>
    );
  }

  if (!confirmations?.length) {
    return (
      <div className="py-6 text-center text-sm text-gray-600">
        No Approvers have confirmed this proposal yet
      </div>
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
