// DO NOT USE "use client" here as it breaks metadata for openGraph
import DelegatePage from 'src/features/delegation/components/delegatePage';

export const dynamicParams = true;

export type DelegateParams = { params: { address: Address } };

export async function generateMetadata({ params: { address } }: DelegateParams) {
  return {
    openGraph: {
      title: `${address}`,
      description: `Delegate to ${address}`,
    },
  };
}

export default function Page({ params: { address } }: DelegateParams) {
  return <DelegatePage address={address} />;
}
