'use client';

import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { Fade } from 'src/components/animation/Fade';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { TabHeaderFilters } from 'src/components/buttons/TabHeaderButton';
import { SearchField } from 'src/components/input/SearchField';
import { Section } from 'src/components/layout/Section';
import { DropdownModal } from 'src/components/menus/Dropdown';
import { H1 } from 'src/components/text/headers';
import { ProposalCard } from 'src/features/governance/components/ProposalCard';
import {
  GetInvolvedCtaCard,
  NoFundsLockedCtaCard,
} from 'src/features/governance/components/ctaCards';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { useGovernanceProposals } from 'src/features/governance/hooks/useGovernanceProposals';
import { useGovernanceVotingPower } from 'src/features/governance/hooks/useVotingStatus';
import { ProposalStage } from 'src/features/governance/types';
import EllipsisIcon from 'src/images/icons/ellipsis.svg';
import { useIsMobile } from 'src/styles/mediaQueries';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

enum Filter {
  Recent = 'Recent',
  Voting = 'Voting',
  Upcoming = 'Upcoming',
  History = 'History',
}

// NOTE: 30 days in ms
const RECENT_TIME_DIFF_MS = 1000 * 60 * 60 * 24 * 30;

const FILTERS: Record<Filter, (proposal: MergedProposalData) => boolean> = {
  [Filter.Recent]: (p) =>
    p.stage > ProposalStage.None &&
    Boolean(p.proposal) &&
    p.proposal!.timestamp >= Date.now() - RECENT_TIME_DIFF_MS,
  [Filter.Voting]: (p) => p.stage === ProposalStage.Referendum,
  [Filter.Upcoming]: (p) => p.stage < ProposalStage.Referendum,
  [Filter.History]: (p) => p.stage > ProposalStage.Execution,
};

export default function Page() {
  return (
    <>
      <Section className="mt-4">
        <ProposalList />
      </Section>
      <div className="fixed bottom-10 right-5 hidden md:block">
        <GetInvolvedCtaCard />
      </div>
    </>
  );
}

function ProposalList() {
  const isMobile = useIsMobile();

  const { proposals } = useGovernanceProposals();
  const { address } = useAccount();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<Filter>(Filter.Recent);

  const filteredProposals = useFilteredProposals({ proposals, filter, searchQuery });

  const headerCounts = useMemo<Record<Filter, number>>(() => {
    return Object.entries(FILTERS).reduce(
      (acc, [key, fn]) => ({
        ...acc,
        [key]: proposals ? proposals.filter(fn).length : 0,
      }),
      {} as Record<Filter, number>,
    );
  }, [proposals]);

  const { votingPower } = useGovernanceVotingPower(address);

  return (
    <div className="space-y-5 md:min-w-[38rem]">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-12">
          <H1>Proposals</H1>
          <DropdownModal
            buttonClasses="md:hidden"
            button={() => <Image src={EllipsisIcon} width={24} height={24} alt="..." />}
            modal={() => <GetInvolvedCtaCard />}
          />
        </div>
        <SearchField
          value={searchQuery}
          setValue={setSearchQuery}
          placeholder="Search proposals"
          className="w-full text-sm md:w-64"
        />
      </div>
      {address && !isNullish(votingPower) && votingPower <= 0n && <NoFundsLockedCtaCard />}
      {filteredProposals ? (
        <Fade show>
          <TabHeaderFilters
            activeFilter={filter}
            setFilter={setFilter}
            counts={headerCounts}
            showCount={!isMobile}
            className="border-b border-taupe-300 pb-2 pt-1 all:space-x-4 md:space-x-6"
          />
          <div className="mt-5 divide-y divide-taupe-300">
            {filteredProposals.length ? (
              filteredProposals.map((data, i) => (
                <div key={i} className="py-5 first:pt-0">
                  <ProposalCard propData={data} />
                </div>
              ))
            ) : (
              <div className="flex justify-center py-10">
                <p className="text-center text-taupe-600">
                  No proposals found{searchQuery ? ` with query "${searchQuery}"` : ''}…
                </p>
              </div>
            )}
          </div>
        </Fade>
      ) : (
        <FullWidthSpinner>Loading governance data</FullWidthSpinner>
      )}
    </div>
  );
}

function useFilteredProposals({
  proposals,
  filter,
  searchQuery,
}: {
  proposals?: MergedProposalData[];
  filter: Filter;
  searchQuery: string;
}) {
  const tabFiltered = useMemo<MergedProposalData[] | undefined>(() => {
    if (!proposals) return undefined;
    return filter ? proposals.filter(FILTERS[filter]) : proposals;
  }, [proposals, filter]);

  const query = searchQuery.trim().toLowerCase();
  const queryFilter = useCallback(
    (p: MergedProposalData) =>
      !query ||
      p.proposal?.proposer?.toLowerCase().includes(query) ||
      p.proposal?.url?.toLowerCase().includes(query) ||
      p.metadata?.title?.toLowerCase().includes(query) ||
      p.metadata?.author?.toLowerCase().includes(query) ||
      String(p.metadata?.cgp).toLowerCase().includes(query) ||
      String(p.id).toLowerCase().includes(query) ||
      p.metadata?.url?.toLowerCase().includes(query),
    [query],
  );

  const queryFiltered = useMemo<MergedProposalData[] | undefined>(() => {
    if (!tabFiltered) return undefined;
    return tabFiltered.filter(queryFilter);
  }, [tabFiltered, queryFilter]);

  return queryFiltered;
}
