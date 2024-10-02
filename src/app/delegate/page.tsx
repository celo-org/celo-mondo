'use client';

import Link from 'next/link';
import { Fade } from 'src/components/animation/Fade';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { CtaCard } from 'src/components/layout/CtaCard';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { DelegateesTable } from 'src/features/delegation/components/DelegateesTable';
import { useDelegatees } from 'src/features/delegation/hooks/useDelegatees';

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

function DelegateeTableSection() {
  const { delegatees } = useDelegatees();

  if (!delegatees) {
    return <FullWidthSpinner>Loading delegate data</FullWidthSpinner>;
  }

  return (
    <Fade show>
      <DelegateesTable delegatees={delegatees} />
    </Fade>
  );
}

function RegisterCtaCard() {
  return (
    <CtaCard>
      <div className="space-y-2">
        <h3 className="font-serif text-xl sm:text-2xl">Passionate about Celo governance?</h3>
        <p className="text-sm sm:text-base">
          If you would like to be included in this list, fill a form by clicking the button.
        </p>
      </div>
      <Link href="/delegate/register" className="btn btn-primary rounded-full border-taupe-300">
        Register as a delegatee
      </Link>
    </CtaCard>
  );
}
