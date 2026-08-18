// DO NOT USE "use client" here as it breaks metadata for openGraph
import { Metadata } from 'next';
import DelegatePage from 'src/features/delegation/components/delegatePage';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { getServerSideDelegatees } from 'src/features/delegation/serverSideDelegatees';
import { getXName } from 'src/features/delegation/utils';
import { shortenAddress } from 'src/utils/addresses';
import { serializeBigints } from 'src/utils/objects';

// Serve a cached page and refresh it in the background at most every 5 minutes
export const revalidate = 300;

export type Params = Promise<{ address: Address }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const metadata = getDelegateeMetadata();
  const { address } = await props.params;
  const data = metadata[address];
  const displayName = data?.name || shortenAddress(address);
  const title = `${displayName} - ${shortenAddress(address)}`;
  const description = data?.description
    ? `Delegate to ${displayName} on Celo Mondo. ${data.description}`
    : `Delegate to ${displayName} | ${address}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title: shortenAddress(address),
      creator: data ? getXName(data) : undefined,
      site: '@celo',
      card: 'summary_large_image',
    },
  };
}

export default async function Page(props: { params: Params }) {
  const { address } = await props.params;
  const initialDelegatees = await getServerSideDelegatees();
  return (
    <DelegatePage
      address={address}
      initialDelegatees={initialDelegatees ? serializeBigints(initialDelegatees) : undefined}
    />
  );
}
