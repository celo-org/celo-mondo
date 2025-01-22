import { Metadata } from 'next';
import Link from 'next/link';
import { CtaCard } from 'src/components/layout/CtaCard';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { DelegateeTableSection } from 'src/features/delegation/components/DelegateesTable';

const basicTitleDecription = {
  title: 'Celo Mondo | Delegatees',
  description: 'Delegate voting power to a delegatee of your choice.',
};

export const metadata: Metadata = {
  ...basicTitleDecription,
  openGraph: basicTitleDecription,
  twitter: {
    title: 'Celo Mondo', // shown on twitter cards
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

function RegisterCtaCard() {
  return (
    <CtaCard>
      <div className="space-y-2">
        <h3 className="font-serif text-xl sm:text-2xl">Passionate about Celo governance?</h3>
        <p className="text-sm sm:text-base">
          If you would like to be included in this list, fill out{' '}
          <Link href="/delegate/register" className={'text-blue-500 hover:underline'}>
            the registration form
          </Link>
          .
        </p>
      </div>
      <Link href="/delegate/register" className="btn btn-primary rounded-full border-taupe-300">
        Register as a delegatee
      </Link>
    </CtaCard>
  );
}
