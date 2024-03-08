import { formatNumberString } from 'src/components/numbers/Amount';
import { useGovernanceProposal } from 'src/features/governance/hooks/useGovernanceProposals';
import { trimToLength } from 'src/utils/strings';

export function ProposalFormDetails({
  proposalId,
  votingPower,
}: {
  proposalId: number;
  votingPower?: bigint;
}) {
  const propData = useGovernanceProposal(proposalId);
  const { proposal, metadata } = propData || {};
  const proposedTimeValue = proposal?.timestamp
    ? new Date(proposal.timestamp).toLocaleDateString()
    : undefined;
  const cgpId = metadata?.cgp ? `(CGP ${metadata.cgp})` : '';

  return (
    <>
      <h3>{`Proposal ID: #${proposalId} ${cgpId}`}</h3>
      {metadata && <p className="text-sm">{trimToLength(metadata.title, 35)}</p>}
      {votingPower && (
        <p className="text-sm">{`Voting power: ${formatNumberString(votingPower, 2, true)}`}</p>
      )}
      {proposedTimeValue && (
        <div className="text-sm text-taupe-600">{`Proposed ${proposedTimeValue}`}</div>
      )}
    </>
  );
}
