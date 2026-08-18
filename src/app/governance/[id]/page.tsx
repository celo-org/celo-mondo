// DO NOT USE "use client" here as it breaks metadata
import { Metadata } from 'next';
import { Section } from 'src/components/layout/Section';
import { Proposal } from 'src/features/governance/components/Proposal';
import { findProposal } from 'src/features/governance/governanceData';
import {
  getServerSideProposalContent,
  getServerSideProposals,
} from 'src/features/governance/serverSideProposals';
import { celoPublicClient } from 'src/utils/client';
import { serializeBigints } from 'src/utils/objects';

// Serve a cached page and refresh it in the background at most every 5 minutes
export const revalidate = 300;

// id might be just a number as a string or can be cgp-N
type Params = Promise<{ id: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { id } = await props.params;

  const proposals = await getServerSideProposals(celoPublicClient.chain.id);
  const propData = findProposal(proposals ?? undefined, id);
  if (!propData) {
    return {
      title: `Proposal ${id}`,
      description: `View and Vote on Celo Governance Proposals on Celo Mondo`,
    };
  }
  const title = propData.metadata?.title ? `${id}: ${propData.metadata.title}` : `Proposal ${id}`;
  const description = `View and Vote on Celo Governance Proposal ${propData.metadata?.cgp ?? ''} - #${propData.proposal?.id ?? ''} on Celo Mondo`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function Page(props: { params: Params }) {
  const { id } = await props.params;
  const proposals = await getServerSideProposals(celoPublicClient.chain.id);
  const propData = findProposal(proposals ?? undefined, id);
  const cgpNumber = propData?.metadata?.cgp;
  const content = cgpNumber ? await getServerSideProposalContent(cgpNumber) : null;

  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">
      <Proposal
        id={id}
        initialProposals={proposals ? serializeBigints(proposals) : undefined}
        initialContent={content ?? undefined}
      />
    </Section>
  );
}
