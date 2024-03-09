'use client';

import { Fade } from 'src/components/animation/Fade';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { CtaCard } from 'src/components/layout/CtaCard';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { links } from 'src/config/links';
import { DelegateesTable } from 'src/features/delegation/DelegateesTable';
import { useDelegatees } from 'src/features/delegation/useDelegatees';

export default function Page() {
  return (
    <>
      <Section className="mt-4" containerClassName="space-y-5">
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
        <p className="text-sm sm:text-base">Add your information on Github to be listed here.</p>
      </div>
      <ExternalLink href={links.delegate} className="btn btn-primary rounded-full border-taupe-300">
        Register as a delegate
      </ExternalLink>
    </CtaCard>
  );
}
