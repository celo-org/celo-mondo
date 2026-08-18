// DO NOT USE "use client" here as it breaks metadata for openGraph
import { Metadata } from 'next';
import ValidatorPage from 'src/features/staking/page';
import { getServerSideValidatorGroups } from 'src/features/validators/serverSideValidatorGroups';
import { shortenAddress } from 'src/utils/addresses';
import { serializeBigints } from 'src/utils/objects';

// Serve a cached page and refresh it in the background at most every 5 minutes
export const revalidate = 300;

type Params = Promise<{ address: Address }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { address } = await props.params;
  const groups = await getServerSideValidatorGroups();
  const groupName = groups?.addressToGroup?.[address]?.name;
  const displayName = groupName || shortenAddress(address);
  const title = `Stake with ${displayName}`;
  const description = `Stake CELO with ${displayName} (${address}) on Celo Mondo`;
  return {
    title,
    description,
    openGraph: {
      title: `Celo Mondo | ${title}`,
      description,
    },
    twitter: {
      title: displayName,
      site: '@celo',
      card: 'summary_large_image',
    },
  };
}

export default async function Page(props: { params: Params }) {
  const { address } = await props.params;
  const initialData = await getServerSideValidatorGroups();
  return (
    <ValidatorPage
      address={address}
      initialValidatorGroups={initialData ? serializeBigints(initialData) : undefined}
    />
  );
}
