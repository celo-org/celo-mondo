import { Metadata } from 'next';
import { GovernancePage } from 'src/features/governance/components/GovernancePage';
import { getServerSideProposals } from 'src/features/governance/serverSideProposals';
import { celoPublicClient } from 'src/utils/client';
import { serializeBigints } from 'src/utils/objects';

// Serve a cached page and refresh it in the background at most every 5 minutes
export const revalidate = 300;

const description =
  'Browse and vote on Celo governance proposals. Participate in shaping the future of the Celo network.';

export const metadata: Metadata = {
  // The root layout template appends the "Celo Mondo" branding
  title: 'Governance',
  description,
  openGraph: { title: 'Celo Mondo | Governance', description },
  twitter: {
    title: 'Celo Mondo',
    site: '@celo',
    card: 'summary_large_image',
  },
};

export default async function Page() {
  const proposals = await getServerSideProposals(celoPublicClient.chain.id);
  return <GovernancePage initialProposals={proposals ? serializeBigints(proposals) : undefined} />;
}
