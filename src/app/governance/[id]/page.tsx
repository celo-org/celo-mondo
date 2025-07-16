'use server';

// DO NOT USE "use client" here as it breaks metadata
import { Metadata } from 'next';
import { Section } from 'src/components/layout/Section';
import { Proposal } from 'src/features/governance/components/Proposal';
import { fetchProposals } from 'src/features/governance/fetchProposals';
import { celoPublicClient } from 'src/utils/client';

// id might be just a number as a string or can be cgp-N
type Params = Promise<{ id: string }>;

// TODO: DEDUP
function findProposal(
  proposals: Awaited<ReturnType<typeof fetchProposals>> | undefined,
  id: string,
) {
  if (!proposals || !id) return undefined;
  const matches = new RegExp(/^(cgp-)?(\d+)$/).exec(id);
  if (matches?.[1] === 'cgp-') {
    const cgpId = parseInt(matches[2]);
    return proposals.find((p) => p.cgp === cgpId);
  } else if (matches?.[2]) {
    const propId = parseInt(matches[2]);
    return proposals.find((p) => p.id === propId);
  } else {
    return undefined;
  }
}
export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { id } = await props.params;
  const proposals = await fetchProposals(celoPublicClient.chain.id);
  const proposal = findProposal(proposals, id);
  const title = `${id}: ${proposal?.title}`;
  const description = `View and Vote on Celo Governance Proposal ${proposal?.cgp} - #${proposal?.id} on Celo Mondo`;
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
