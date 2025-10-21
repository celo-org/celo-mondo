'use client';
import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { SocialLogoLink } from 'src/components/logos/SocialLogo';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { SocialLinkType } from 'src/config/types';
import { DelegateButton } from 'src/features/delegation/components/DelegateButton';
import { DelegateeLogo } from 'src/features/delegation/components/DelegateeLogo';
import { DelegatorsTable } from 'src/features/delegation/components/DelegatorsTable';
import { useDelegateeHistory } from 'src/features/delegation/hooks/useDelegateeHistory';
import { Delegatee } from 'src/features/delegation/types';
import { ProposalCard } from 'src/features/governance/components/ProposalCard';
import { useGovernanceProposals } from 'src/features/governance/hooks/useGovernanceProposals';
import { VoteTypeToIcon } from 'src/features/governance/types';
import { getLargestVoteType } from 'src/features/governance/utils/votes';

export function DelegateeDescription({ delegatee }: { delegatee: Delegatee }) {
  const dateString = new Date(delegatee.date).toLocaleDateString();

  return (
    <div className="max-w-full space-y-4 " style={{ maxWidth: 'min(96vw, 700px)' }}>
      <BackLink href="/delegate">Browse delegates</BackLink>
      <div className="flex items-center gap-1 mt-2">
        <DelegateeLogo address={delegatee.address} size={90} />
        <div className="ml-4 flex flex-col">
          <h1 className="font-serif text-2xl md:text-3xl">{delegatee.name}</h1>
          <div className="flex items-center space-x-2">
            <ShortAddress
              address={delegatee.address}
              className="font-mono text-sm text-taupe-600"
            />
            <span className="text-sm text-taupe-600">•</span>
            <span className="text-sm text-taupe-600">{`Since ${dateString}`}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center space-x-3">
            {Object.entries(delegatee.links).map(([type, href], i) => (
              <SocialLogoLink key={i} type={type as SocialLinkType} href={href} />
            ))}
            {delegatee.interests.map((interest, i) => (
              <span
                key={i}
                className="hidden rounded-full border border-taupe-300 px-2 text-sm sm:block"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
      <h2 className="font-serif text-xl">Introduction</h2>
      <p className="overflow-auto leading-relaxed">
        {delegatee.description}
      </p>
      <GovernanceParticipation delegatee={delegatee} />
    </div>
  );
}
function GovernanceParticipation({ delegatee }: { delegatee: Delegatee }) {
  const { proposalToVotes, isLoading: isLoadingHistory } = useDelegateeHistory(delegatee.address);
  const { proposals, isLoading: isLoadingProposals } = useGovernanceProposals();

  const isLoading = isLoadingHistory || isLoadingProposals;
  const sortedIds = useMemo(
    () =>
      Object.keys(proposalToVotes || {})
        .map((p) => parseInt(p))
        .sort((a, b) => b - a),
    [proposalToVotes],
  );
  const hasVotes = proposalToVotes && sortedIds.length > 0;

  return (
    <div className="flex flex-col space-y-2.5 divide-y border-taupe-300 py-1" >
      <h2 className="font-serif text-xl">Governance Participation</h2>
      {isLoading ? (
        <SpinnerWithLabel className="py-10">Loading governance history</SpinnerWithLabel>
      ) : proposals && hasVotes ? (
        sortedIds.map((id, i) => {
          const votes = proposalToVotes[id];
          const proposal = proposals.find((p) => p.id === id);
          if (!proposal) return null;
          const { type } = getLargestVoteType(votes);
          return (
            <div key={i} className="pt-2.5">
              <ProposalCard propData={proposal} isCompact={true} />
              <div className="mt-1.5 text-sm">{`Voted ${type} ${VoteTypeToIcon[type]}`}</div>
            </div>
          );
        })
      ) : (
        <p className="text-gray-600">This delegate has not voted for governance proposals yet</p>
      )}
    </div>
  );
}
export function DelegateeDetails({ delegatee }: { delegatee: Delegatee }) {
  return (
    <div className="space-y-4 lg:w-[330px] lg:min-w-[20rem]">
      <div className="border-taupe-300 p-3 lg:border">
        <DelegateButton delegatee={delegatee} />
      </div>
      <div className="hidden border-taupe-300 p-3 lg:block lg:border">
        <DelegatorsTable delegatee={delegatee} />
      </div>
    </div>
  );
}
