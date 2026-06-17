import { Metadata } from 'next';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { DelegateeTableSection } from 'src/features/delegation/components/DelegateesTable';
import { RegisterCtaCard } from './RegisterCtaCard';

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

export default function Page() {
  return (
    <>
      <Section className="mt-4" containerClassName="space-y-4">
        <H1>Delegate voting power</H1>
        <RegisterCtaCard />
        <DelegateeTableSection />
      </Section>
    </>
  );
}
