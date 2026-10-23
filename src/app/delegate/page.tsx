import { Metadata } from 'next';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { DelegateeTableSection } from 'src/features/delegation/components/DelegateesTable';
import { getServerSideDelegatees } from 'src/features/delegation/serverSideDelegatees';
import { serializeBigints } from 'src/utils/objects';
import { RegisterCtaCard } from './RegisterCtaCard';

// Serve a cached page and refresh it in the background at most every 5 minutes
export const revalidate = 300;

const basicTitleDescription = {
  title: 'Celo Mondo | Delegatees',
  description: 'Delegate voting power to a delegatee of your choice.',
};

export const metadata: Metadata = {
  ...basicTitleDescription,
  openGraph: basicTitleDescription,
  twitter: {
    title: 'Celo Mondo', // shown on twitter cards
    site: '@celo',
    card: 'summary_large_image',
  },
};

export default async function Page() {
  const initialDelegatees = await getServerSideDelegatees();
  return (
    <>
      <Section className="mt-4" containerClassName="space-y-4">
        <H1>Delegate voting power</H1>
        <RegisterCtaCard />
        <DelegateeTableSection
          initialDelegatees={initialDelegatees ? serializeBigints(initialDelegatees) : undefined}
        />
      </Section>
    </>
  );
}
