import { formatNumberString } from 'src/components/numbers/Amount';
import { useGovernanceProposal } from 'src/features/governance/hooks/useGovernanceProposals';
import { trimToLength } from 'src/utils/strings';
import { getUTCDateString } from 'src/utils/time';

export function ProposalFormDetails({
  proposalId,
  votingPower,
}: {
  proposalId: number;
  votingPower?: bigint;
}) {
  const propData = useGovernanceProposal(proposalId);
  const { proposal, metadata } = propData || {};
  const proposedMs = proposal?.timestamp ? proposal.timestamp : undefined;
  const proposedTimeValue = proposedMs ? new Date(proposedMs).toLocaleDateString() : undefined;
  const proposedUtc = proposedMs ? getUTCDateString(proposedMs) : undefined;
  const cgpId = metadata?.cgp ? `(CGP ${metadata.cgp})` : '';

  return (
    <>
      <h3>{`Proposal ID: #${proposalId} ${cgpId}`}</h3>
      {metadata && <p className="text-sm">{trimToLength(metadata.title, 35)}</p>}
      {votingPower && (
        <p className="text-sm">{`Voting power: ${formatNumberString(votingPower, 2, true)}`}</p>
      )}
      {proposedTimeValue && (
        <div
          className="tooltip text-sm text-taupe-600"
          data-tip={proposedUtc}
        >{`Proposed ${proposedTimeValue}`}</div>
      )}
    </>
  );
}
