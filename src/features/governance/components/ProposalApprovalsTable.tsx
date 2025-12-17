import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { Identicon } from 'src/components/icons/Identicon';
import { Collapse } from 'src/components/menus/Collapse';
import AddressLabel from 'src/components/text/AddressLabel';
import { CopyInline } from 'src/components/text/CopyInline';
import { ApprovalBadge } from 'src/features/governance/components/ApprovalBadge';
import { useProposalApprovers } from 'src/features/governance/hooks/useProposalApprovers';
import { ProposalStage } from 'src/features/governance/types';
import { normalizeAddress, shortenAddress } from 'src/utils/addresses';
import { useAddressToLabel } from 'src/utils/useAddressToLabel';
import { Address } from 'viem';

export function ProposalApprovalsTable({
  proposalId,
  stage,
  transactionCount,
}: {
  proposalId: number;
  transactionCount: number | null;
  stage: ProposalStage;
}) {
  const { isLoading, confirmations, requiredConfirmationsCount } = useProposalApprovers(proposalId);
  const fraction =
    !isLoading && confirmations?.length
      ? `${confirmations.length} / ${requiredConfirmationsCount}`
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
          <ApprovalBadge
            proposalId={proposalId}
            stage={stage}
            transactionCount={transactionCount}
          />
        </div>
        {confirmations?.length ? (
          <ConfirmationsTable isLoading={isLoading} confirmations={confirmations} />
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
  confirmations: Address[];
}) {
  const addressToLabel = useAddressToLabel((a) => shortenAddress(a, true, 10, 10));

  if (isLoading) {
    return (
      <SpinnerWithLabel size="md" className="py-6">
        Loading Approvers
      </SpinnerWithLabel>
    );
  }

  return (
    <div className="flex flex-col">
      {confirmations.map((approver) => {
        const { fallback } = addressToLabel(approver);
        return (
          <CopyInline
            key={approver}
            className="align-center flex flex-row justify-center gap-x-2"
            text={
              <>
                <Identicon address={approver} size={20} />
                <div className="flex flex-grow flex-row items-start gap-x-4">
                  <span className="font-mono text-sm">{fallback}</span>
                  <AddressLabel address={approver} hiddenIfNoLabel />
                </div>
              </>
            }
            textToCopy={normalizeAddress(approver)}
            title="Copy address"
          />
        );
      })}
    </div>
  );
}
