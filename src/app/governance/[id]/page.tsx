'use client';

import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { Section } from 'src/components/layout/Section';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import { links } from 'src/config/links';
import { ProposalBadgeRow } from 'src/features/governance/ProposalCard';
import { VoteValue } from 'src/features/governance/contractTypes';
import {
  MergedProposalData,
  useGovernanceProposals,
} from 'src/features/governance/useGovernanceProposals';
import { useProposalContent } from 'src/features/governance/useProposalContent';
import { usePageInvariant } from 'src/utils/navigation';
import { trimToLength } from 'src/utils/strings';
import { getHumanReadableDuration } from 'src/utils/time';
import styles from './styles.module.css';

const ID_PARAM_REGEX = /^(cgp-)?(\d+)$/;

export const dynamicParams = true;

export default function Page({ params: { id } }: { params: { id: string } }) {
  const { proposals } = useGovernanceProposals();

  const proposal = useMemo(() => {
    if (!proposals || !id) return undefined;
    const matches = ID_PARAM_REGEX.exec(id);
    if (matches?.length === 2) {
      const propId = parseInt(matches[1]);
      return proposals.find((p) => p.proposal?.id === propId);
    } else if (matches?.length === 3) {
      const cgpId = parseInt(matches[2]);
      return proposals.find((p) => p.metadata?.cgp === cgpId);
    } else {
      return undefined;
    }
  }, [proposals, id]);

  usePageInvariant(!proposals || proposal, '/governance', 'Proposal not found');

  if (!proposal) {
    return <FullWidthSpinner>Loading proposals</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="space-y-4 mt-4">
      <div className="flex flex-col items-stretch md:flex-row">
        <ProposalContent data={proposal} />
        <ProposalChainData data={proposal} />
      </div>
    </Section>
  );
}

function ProposalContent({ data }: { data: MergedProposalData }) {
  const { proposal, metadata } = data;
  const title = trimToLength(metadata?.title || `Proposal #${proposal?.id}`, 80);

  const { content, isLoading } = useProposalContent(metadata);

  return (
    <div className="space-y-3">
      <BackLink href="/governance">Browse proposals</BackLink>
      <h1 className="font-serif text-2xl md:text-2xl">{title}</h1>
      <ProposalBadgeRow data={data} showProposer />
      {isLoading && !content && <FullWidthSpinner>Loading proposal content</FullWidthSpinner>}
      {!isLoading && !content && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <p className="text-center text-taupe-600">No CGP content found for this proposal</p>
          <p className="text-center text-taupe-600">
            Check the{' '}
            <ExternalLink href={links.governance} className="underline">
              Celo Governance repository
            </ExternalLink>{' '}
            for more information
          </p>
        </div>
      )}
      {content && (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          className={`max-w-screen-md space-y-4 pb-4 ${styles.proposal}`}
        ></div>
      )}
    </div>
  );
}

function ProposalChainData({ data: { proposal } }: { data: MergedProposalData }) {
  if (!proposal) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-3 border border-taupe-300 p-4">
        <div className="flex items-center justify-between gap-6">
          <h2 className="font-serif text-2xl">Vote</h2>
          <div className="flex items-center text-sm font-medium">
            {`Voting power: ${formatNumberString(0)} CELO `}
            <HelpIcon text="Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 md:flex-col md:items-stretch">
          <SolidButton className="btn-neutral">{`👍 Yes`}</SolidButton>
          <SolidButton className="btn-neutral">{`👎 No`}</SolidButton>
          <SolidButton className="btn-neutral">{`⚪ Abstain`}</SolidButton>
        </div>
        {proposal.expiryTimestamp && (
          <div>{`Voting ends in ${getHumanReadableDuration(proposal.expiryTimestamp)}`}</div>
        )}
        {proposal.votes && (
          <>
            <div className="flex items-center justify-between gap-6">
              <h2 className="font-serif text-2xl">Result</h2>
              <div className="flex items-center text-sm font-medium">
                {`Support required: ${'TODO'}%`}
                <HelpIcon text="Depending on the value/function being modified, different quorum and approval settings are required." />
              </div>
            </div>
            <div>{'TODO bar charts'}</div>
            <div>
              <Amount valueWei={proposal.votes[VoteValue.Yes]} className="text-2xl" />
              {'TODO stackedbar'}
            </div>
          </>
        )}
      </div>
      <div className="border border-taupe-300 p-4">
        <h2>Results</h2>
      </div>
      <div className="border border-taupe-300 p-4">
        <h2>Voters</h2>
      </div>
    </div>
  );
}
