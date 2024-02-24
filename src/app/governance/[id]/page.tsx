'use client';

import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { Section } from 'src/components/layout/Section';
import { links } from 'src/config/links';
import { ProposalBadgeRow } from 'src/features/governance/ProposalCard';
import {
  ProposalUpvoteButton,
  ProposalVoteButtons,
} from 'src/features/governance/ProposalVoteButtons';
import { ProposalVoteChart } from 'src/features/governance/ProposalVoteChart';
import { ProposalVotersTable } from 'src/features/governance/ProposalVotersTable';
import { ProposalStage } from 'src/features/governance/contractTypes';
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

  const propData = useMemo(() => {
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

  usePageInvariant(!proposals || propData, '/governance', 'Proposal not found');

  if (!propData) {
    return <FullWidthSpinner>Loading proposals</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="space-y-4 mt-4">
      <div className="flex flex-col items-stretch md:flex-row md:gap-6">
        <ProposalContent propData={propData} />
        <ProposalChainData propData={propData} />
      </div>
    </Section>
  );
}

function ProposalContent({ propData }: { propData: MergedProposalData }) {
  const { proposal, metadata } = propData;
  const title = trimToLength(metadata?.title || `Proposal #${proposal?.id}`, 80);

  const { content, isLoading } = useProposalContent(metadata);

  return (
    <div className="space-y-3">
      <BackLink href="/governance">Browse proposals</BackLink>
      <h1 className="font-serif text-2xl md:text-2xl">{title}</h1>
      <ProposalBadgeRow data={propData} showProposer />
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

function ProposalChainData({ propData }: { propData: MergedProposalData }) {
  const { proposal, stage } = propData;
  const expiryTimestamp = proposal?.expiryTimestamp;

  return (
    <div className="min-w-[20rem] space-y-4">
      <div className="space-y-4 border border-taupe-300 p-3">
        {stage === ProposalStage.Queued && <ProposalUpvoteButton />}
        {stage === ProposalStage.Referendum && <ProposalVoteButtons />}
        {expiryTimestamp && (
          <div>{`Voting ends in ${getHumanReadableDuration(expiryTimestamp)}`}</div>
        )}
        {stage >= ProposalStage.Referendum && <ProposalVoteChart propData={propData} />}
      </div>
      <div className="border border-taupe-300 p-3">
        {stage >= ProposalStage.Referendum && <ProposalVotersTable propData={propData} />}
      </div>
    </div>
  );
}
