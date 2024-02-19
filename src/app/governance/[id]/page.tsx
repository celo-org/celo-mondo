'use client';

import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { Section } from 'src/components/layout/Section';
import { links } from 'src/config/links';
import { ProposalBadgeRow } from 'src/features/governance/ProposalCard';
import {
  MergedProposalData,
  useGovernanceProposals,
} from 'src/features/governance/useGovernanceProposals';
import { useProposalContent } from 'src/features/governance/useProposalContent';
import { usePageInvariant } from 'src/utils/navigation';
import { trimToLength } from 'src/utils/strings';
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
      <h1 className="font-serif text-xl md:text-2xl">{title}</h1>
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
      <div className="border border-taupe-300 p-4">
        <h2>Vote</h2>
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
