// DO NOT USE "use client" here as it breaks metadata for openGraph
import ValidatorPage from 'src/features/staking/page';
type Params = { params: { address: Address } };
export const dynamicParams = true;

export async function generateMetadata({ params: { address } }: Params) {
  return {
    openGraph: {
      title: `${address}`,
      description: `Stake with ${address}`,
    },
  };
}

export default function Page({ params: { address } }: Params) {
  return <ValidatorPage address={address} />;
}
