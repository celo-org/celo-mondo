'use server';

// DO NOT USE "use client" here as it breaks metadata for openGraph
import ValidatorPage from 'src/features/staking/page';
import { shortenAddress } from 'src/utils/addresses';

type Params = Promise<{ address: Address }>;

export async function generateMetadata(props: { params: Params }) {
  const { address } = await props.params;
  return {
    openGraph: {
      title: `Celo Mondo | Stake with ${shortenAddress(address)}`,
      description: `Celo Mondo | Stake with ${address}`,
    },
    twitter: {
      title: shortenAddress(address),
      site: '@celo',
      card: 'summary_large_image',
    },
  };
}

export default async function Page(props: { params: Params }) {
  const { address } = await props.params;
  return <ValidatorPage address={address} />;
}
