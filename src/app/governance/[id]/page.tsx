'use server';

// DO NOT USE "use client" here as it breaks metadata
import { Metadata } from 'next';
import { Section } from 'src/components/layout/Section';
import { Proposal } from 'src/features/governance/components/Proposal';
import { collectProposals, findProposal } from 'src/features/governance/governanceData';
import { celoPublicClient } from 'src/utils/client';

// id might be just a number as a string or can be cgp-N
type Params = Promise<{ id: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { id } = await props.params;
  const proposals = await collectProposals(celoPublicClient);
  const proposal = findProposal(proposals, id);
  const title = `${id}: ${proposal?.metadata?.title}`;
  const description = `View and Vote on Celo Governance Proposal ${proposal?.metadata?.cgp} - #${proposal?.id} on Celo Mondo`;
  return {
    title,
    description,
  };
}

export default async function Page(props: { params: Params }) {
  const { id } = await props.params;
  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">
      <Proposal id={id} />
    </Section>
  );
}
