// DO NOT USE "use client" here as it breaks metadata for openGraph
import DelegatePage from 'src/features/delegation/components/delegatePage';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { getXName } from 'src/features/delegation/utils';
import { shortenAddress } from 'src/utils/addresses';
export const dynamicParams = true;

export type DelegateParams = { params: { address: Address } };

export async function generateMetadata({ params: { address } }: DelegateParams) {
  const metadata = getDelegateeMetadata();

  const data = metadata[address];

  return {
    openGraph: {
      title: `${data.name} - ${shortenAddress(address)}`,
      description: `Delegate to ${data.name} | ${address}`,
    },
    twitter: {
      title: shortenAddress(address),
      creator: getXName(data),
    },
  };
}

export default function Page({ params: { address } }: DelegateParams) {
  return <DelegatePage address={address} />;
}
