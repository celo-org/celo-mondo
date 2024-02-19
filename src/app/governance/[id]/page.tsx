'use client';

import { useMemo } from 'react';
import { BackLink } from 'src/components/buttons/BackLink';
import { Section } from 'src/components/layout/Section';
import { ProposalBadgeRow } from 'src/features/governance/ProposalCard';
import {
  MergedProposalData,
  useGovernanceProposals,
} from 'src/features/governance/useGovernanceProposals';
import { useProposalContent } from 'src/features/governance/useProposalContent';
import { usePageInvariant } from 'src/utils/navigation';
import { trimToLength } from 'src/utils/strings';

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
  if (!proposal) return null;

  return (
    <Section containerClassName="space-y-4 mt-4">
      <div className="flex flex-col md:flex-row">
        <ProposalContent data={proposal} />
        <ProposalChainData data={proposal} />
      </div>
    </Section>
  );
}

function ProposalContent({ data }: { data: MergedProposalData }) {
  const { proposal, metadata } = data;
  const title = trimToLength(metadata?.title || `Proposal #${proposal?.id}`, 80);

  //TODO loading/err
  const { content } = useProposalContent(metadata);

  return (
    <div className="space-y-3">
      <BackLink href="/governance">Browse proposals</BackLink>
      <h1 className="font-serif text-xl md:text-2xl">{title}</h1>
      <ProposalBadgeRow data={data} showProposer />
      <div dangerouslySetInnerHTML={{ __html: content || '' }}></div>
    </div>
  );
}

function ProposalChainData({ data: { proposal } }: { data: MergedProposalData }) {
  if (!proposal) return null;
  return <div>TODO</div>;
}
