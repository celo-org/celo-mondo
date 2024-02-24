'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Fade } from 'src/components/animation/Fade';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { TabHeaderFilters } from 'src/components/buttons/TabHeaderButton';
import { SearchField } from 'src/components/input/SearchField';
import { Section } from 'src/components/layout/Section';
import { DropdownModal } from 'src/components/menus/Dropdown';
import { H1 } from 'src/components/text/headers';
import { useLockedBalance } from 'src/features/account/hooks';
import { ProposalCard } from 'src/features/governance/ProposalCard';
import { ProposalStage } from 'src/features/governance/contractTypes';
import { GetInvolvedCtaCard, NoFundsLockedCtaCard } from 'src/features/governance/ctaCards';
import {
  MergedProposalData,
  useGovernanceProposals,
} from 'src/features/governance/useGovernanceProposals';
import EllipsisIcon from 'src/images/icons/ellipsis.svg';
import { useIsMobile } from 'src/styles/mediaQueries';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

enum Filter {
  All = 'All',
  Upvoting = 'Upvoting',
  Voting = 'Voting',
  Drafts = 'Drafts',
  History = 'History',
}

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
  const { lockedBalance } = useLockedBalance(address);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<Filter>(Filter.All);

  const filteredProposals = useFilteredProposals({ proposals, filter, searchQuery });

  const headerCounts = useMemo<Record<Filter, number>>(() => {
    const _proposals = proposals || [];
    return {
      [Filter.All]: _proposals?.length || 0,
      [Filter.Upvoting]: _proposals.filter((p) => p.stage === ProposalStage.Queued).length,
      [Filter.Voting]: _proposals.filter((p) => p.stage === ProposalStage.Referendum).length,
      [Filter.Drafts]: _proposals.filter((p) => p.stage === ProposalStage.None).length,
      [Filter.History]: _proposals.filter((p) => p.stage > 4).length,
    };
  }, [proposals]);

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
      {address && !isNullish(lockedBalance) && lockedBalance <= 0n && <NoFundsLockedCtaCard />}
      {filteredProposals ? (
        <Fade show>
          <TabHeaderFilters
            activeFilter={filter}
            setFilter={setFilter}
            counts={headerCounts}
            showCount={!isMobile}
            className="border-b border-taupe-300 pb-2 pt-1 all:space-x-4 md:space-x-6"
          />
          <div className="mt-6 divide-y divide-taupe-300">
            {filteredProposals.length ? (
              filteredProposals.map((data, i) => (
                <div key={i} className="py-6 first:pt-0">
                  <ProposalCard propData={data} />
                </div>
              ))
            ) : (
              <div className="flex justify-center py-10">
                <p className="text-center text-taupe-600">No proposals found</p>
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
  return useMemo<MergedProposalData[] | undefined>(() => {
    if (!proposals) return undefined;
    const query = searchQuery.trim().toLowerCase();
    return proposals
      .filter((p) => {
        if (filter === Filter.Upvoting) return p.stage === ProposalStage.Queued;
        if (filter === Filter.Voting) return p.stage === ProposalStage.Referendum;
        if (filter === Filter.Drafts) return p.stage === ProposalStage.None;
        if (filter === Filter.History) return p.stage > 4;
        return true;
      })
      .filter(
        (p) =>
          !query ||
          p.proposal?.proposer.toLowerCase().includes(query) ||
          p.proposal?.url.toLowerCase().includes(query) ||
          p.metadata?.title.toLowerCase().includes(query) ||
          p.metadata?.author.toLowerCase().includes(query) ||
          p.metadata?.url?.toLowerCase().includes(query),
      );
  }, [proposals, filter, searchQuery]);
}
