'use server';

// DO NOT USE "use client" here as it breaks metadata for openGraph
import { Metadata } from 'next';
import DelegatePage from 'src/features/delegation/components/delegatePage';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { getXName } from 'src/features/delegation/utils';
import { shortenAddress } from 'src/utils/addresses';

export type Params = Promise<{ address: Address }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const metadata = getDelegateeMetadata();
  const { address } = await props.params;
  const data = metadata[address];

  return {
    openGraph: {
      title: `${data.name} - ${shortenAddress(address)}`,
      description: `Delegate to ${data.name} | ${address}`,
    },
    twitter: {
      title: shortenAddress(address),
      creator: getXName(data),
      site: '@celo',
      card: 'summary_large_image',
    },
  };
}

export default async function Page(props: { params: Params }) {
  const { address } = await props.params;
  return <DelegatePage address={address} />;
}
