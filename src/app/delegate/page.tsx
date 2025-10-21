import { Metadata } from 'next';
import Link from 'next/link';
import { CtaCard } from 'src/components/layout/CtaCard';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { DelegateeTableSection } from 'src/features/delegation/components/DelegateesTable';

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

function RegisterCtaCard() {
  return (
    <CtaCard>
      <h3 className="col-[1/3] row-[1/2] font-serif text-xl sm:text-2xl md:col-[1/2] md:row-[1/2]">
        Passionate about Celo governance?
      </h3>
      <p className="col-[1/2] row-[2/3] text-sm sm:text-base md:col-[1/2] md:row-[2/3]">
        If you would like to be included in this list, fill out{' '}
        <Link href="/delegate/register" className={'text-blue-500 hover:underline'}>
          the registration form
        </Link>
        .
      </p>
      <div className="col-[2/3] row-[2/3] flex self-center justify-self-center md:col-[2/3] md:row-[1/3]">
        <Link href="/delegate/register" className="btn btn-primary border-taupe-300 rounded-full">
          Register as a delegatee
        </Link>
      </div>
    </CtaCard>
  );
}
