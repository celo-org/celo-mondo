'use client';

import { useMemo, useState } from 'react';
import { Fade } from 'src/components/animation/Fade';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { TabHeaderButton } from 'src/components/buttons/TabHeaderButton';
import { SearchField } from 'src/components/input/SearchField';
import { CtaCard } from 'src/components/layout/CtaCard';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { links } from 'src/config/links';
import { Delegatee } from 'src/features/delegation/types';
import { useDelegatees } from 'src/features/delegation/useDelegatees';

export default function Page() {
  return (
    <>
      <Section className="mt-4" containerClassName="space-y-5">
        <H1>Delegate voting power</H1>
        <RegisterCtaCard />
        <DelegateeList />
      </Section>
    </>
  );
}

function DelegateeList() {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { delegatees } = useDelegatees();
  const filteredDelegatees = useFilteredDelegatees({ delegatees, searchQuery });

  return (
    <div className="">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between"></div>
      {filteredDelegatees ? (
        <Fade show>
          <div className="flex justify-between">
            <TabHeaderButton isActive={true} count={filteredDelegatees.length}>
              Delegates
            </TabHeaderButton>
            <SearchField
              value={searchQuery}
              setValue={setSearchQuery}
              placeholder="Search delegates"
              className="w-full text-sm md:w-64"
            />
          </div>
          <div className="mt-6 divide-y divide-taupe-300">
            {filteredDelegatees.length ? (
              filteredDelegatees.map((data, i) => (
                <div key={i} className="py-6 first:pt-0">
                  {JSON.stringify(data)}
                </div>
              ))
            ) : (
              <div className="flex justify-center py-10">
                <p className="text-center text-taupe-600">No delegates found</p>
              </div>
            )}
          </div>
        </Fade>
      ) : (
        <FullWidthSpinner>Loading delegate data</FullWidthSpinner>
      )}
    </div>
  );
}

function useFilteredDelegatees({
  delegatees,
  searchQuery,
}: {
  delegatees?: Delegatee[];
  searchQuery: string;
}) {
  return useMemo<Delegatee[] | undefined>(() => {
    if (!delegatees) return undefined;
    const query = searchQuery.trim().toLowerCase();
    return delegatees.filter(
      (d) =>
        !query ||
        d.name.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query),
    );
  }, [delegatees, searchQuery]);
}

export function RegisterCtaCard() {
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
