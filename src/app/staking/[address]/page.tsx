// DO NOT USE "use client" here as it breaks metadata for openGraph
import ValidatorPage from 'src/features/staking/page';
import { shortenAddress } from 'src/utils/addresses';
type Params = { params: { address: Address } };
export const dynamicParams = true;

export async function generateMetadata({ params: { address } }: Params) {
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

export default function Page({ params: { address } }: Params) {
  return <ValidatorPage address={address} />;
}
