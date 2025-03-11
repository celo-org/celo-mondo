// DO NOT USE "use client" here as it breaks metadata
import { Section } from 'src/components/layout/Section';
import { Proposal } from 'src/features/governance/components/Proposal';
import { collectProposals, findProposal } from 'src/features/governance/governanceData';
import { createCeloPublicClient } from 'src/utils/client';

export const dynamicParams = true;

// id might be just a number as a string or can be cgp-N
type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params) {
  const publicClient = createCeloPublicClient();
  const proposals = await collectProposals(publicClient);
  const proposal = findProposal(proposals, params.id);

  const title = `${params.id}: ${proposal?.metadata?.title}`;
  const description = `View and Vote on Celo Governance Proposal ${proposal?.metadata?.cgp} - #${proposal?.id} on Celo Mondo`;
  return {
    title,
    description,
  };
}

export default function Page({ params: { id } }: Params) {
  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">
      <Proposal id={id} />
    </Section>
  );
}
