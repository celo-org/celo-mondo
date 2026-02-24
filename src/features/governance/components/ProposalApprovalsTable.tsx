import { ReactNode } from 'react';
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

  return (
    <div className="hidden md:block">
      <Collapse
        button={<h2 className="text-left font-serif text-2xl">Technical Approvals</h2>}
        buttonClasses="w-full"
        defaultOpen={true}
      >
        <div className="space-y-3 pt-2">
          {!isLoading && confirmations && requiredConfirmationsCount != null && (
            <ApprovalProgressBar
              count={confirmations.length}
              required={Number(requiredConfirmationsCount)}
              badge={
                <ApprovalBadge
                  proposalId={proposalId}
                  stage={stage}
                  transactionCount={transactionCount}
                />
              }
            />
          )}
          {confirmations?.length ? (
            <ConfirmationsTable isLoading={isLoading} confirmations={confirmations} />
          ) : null}
        </div>
      </Collapse>
    </div>
  );
}

function ApprovalProgressBar({
  count,
  required,
  badge,
}: {
  count: number;
  required: number;
  badge: ReactNode;
}) {
  const pct = required > 0 ? Math.min((count / required) * 100, 100) : 0;
  const met = count >= required;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Signers</span>
          <span className={`text-xs font-medium ${met ? 'text-green-700' : 'text-taupe-500'}`}>
            {count} / {required}
          </span>
        </div>
        {badge}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-taupe-300 bg-white">
        <div
          className={`h-full rounded-full transition-all ${met ? 'bg-green-500' : 'bg-purple-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
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
    <div className="flex flex-col gap-1.5">
      {confirmations.map((approver) => {
        const { fallback } = addressToLabel(approver);
        return (
          <CopyInline
            key={approver}
            className="hover:bg-taupe-200 flex items-center gap-2 rounded-lg bg-taupe-100 px-3 py-2 transition-colors"
            text={
              <>
                <Identicon address={approver} size={20} />
                <span className="flex-1 font-mono text-xs">{fallback}</span>
                <AddressLabel address={approver} hiddenIfNoLabel />
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
