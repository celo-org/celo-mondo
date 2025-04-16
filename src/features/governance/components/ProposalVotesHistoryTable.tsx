import Link from 'next/link';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { HeaderAndSubheader } from 'src/components/layout/HeaderAndSubheader';
import { PersonalizedProposalCard } from 'src/features/account/PersonalizedProposalCard';
import { useDelegateeHistory } from 'src/features/delegation/hooks/useDelegateeHistory';
import { useGovernanceProposals } from 'src/features/governance/hooks/useGovernanceProposals';
import { objLength } from 'src/utils/objects';
import { useAccount } from 'wagmi';

export function ProposalVotesHistoryTable() {
  const account = useAccount();
  const { proposalToVotes, isLoading: isLoadingHistory } = useDelegateeHistory(account.address!);
  const { proposals, isLoading: isLoadingProposals } = useGovernanceProposals();
  const isLoading = isLoadingHistory || isLoadingProposals;

  if (isLoading) {
    return <FullWidthSpinner>Loading historical data</FullWidthSpinner>;
  }

  if (!objLength(proposalToVotes!)) {
    return (
      <HeaderAndSubheader
        header="No history available"
        subHeader={`You don’t currently have any recorded governance votes with the logged in address. Delegated votes won't show.`}
        className="my-10"
      >
        <Link href="/governance">
          <SolidButton>Go to active proposals</SolidButton>
        </Link>
      </HeaderAndSubheader>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {Object.entries(proposalToVotes!)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .map(([id, votes]) => (
          <PersonalizedProposalCard
            propData={proposals?.find((x) => x.id === parseInt(id, 10))}
            key={id}
            accountVotes={votes}
            className="border-b-[1px] border-taupe-300 pb-2"
          />
        ))}
    </div>
  );
}
