'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { TabHeaderFilters } from 'src/components/buttons/TabHeaderButton';
import { SearchField } from 'src/components/input/SearchField';
import { Section } from 'src/components/layout/Section';
import { DropdownModal } from 'src/components/menus/Dropdown';
import { H1 } from 'src/components/text/headers';
import { links } from 'src/config/links';
import { Proposal, ProposalStage } from 'src/features/governance/contractTypes';
import { useGovernanceProposals } from 'src/features/governance/useGovernanceProposals';
import BookIcon from 'src/images/icons/book.svg';
import EllipsisIcon from 'src/images/icons/ellipsis.svg';
import CeloIcon from 'src/images/logos/celo.svg';
import DiscordIcon from 'src/images/logos/discord.svg';
import { useIsMobile } from 'src/styles/mediaQueries';

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
      <div className="fixed bottom-12 right-5 hidden md:block">
        <CtaModal />
      </div>
    </>
  );
}

function ProposalList() {
  const isMobile = useIsMobile();

  const { proposals } = useGovernanceProposals();

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
      //TODO
      [Filter.History]: _proposals.filter((p) => p.id === 0).length,
    };
  }, [proposals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-12">
          <H1>Proposals</H1>
          <DropdownModal
            buttonClasses="md:hidden"
            button={() => <Image src={EllipsisIcon} width={24} height={24} alt="..." />}
            modal={() => <CtaModal />}
          />
        </div>
        <SearchField
          value={searchQuery}
          setValue={setSearchQuery}
          placeholder="Search proposals"
          className="w-full text-sm md:w-64"
        />
      </div>
      <div></div>
      {filteredProposals ? (
        <div className="divide-y divide-taupe-300">
          <TabHeaderFilters
            activeFilter={filter}
            setFilter={setFilter}
            counts={headerCounts}
            showCount={!isMobile}
            className="pb-2 all:space-x-4 md:space-x-6"
          />
          {filteredProposals.length ? (
            filteredProposals.map((proposal) => <Proposal key={proposal.id} proposal={proposal} />)
          ) : (
            <div className="flex justify-center py-10">
              <p className="text-center text-taupe-600">No proposals found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center py-10">
          <SpinnerWithLabel>Loading governance data</SpinnerWithLabel>
        </div>
      )}
    </div>
  );
}

function Proposal({ proposal }: { proposal: Proposal }) {
  return (
    <div className="flex justify-between">
      <div>
        <h3 className="font-serif text-lg">{'TODO'}</h3>
        <p className="text-gray-600">{proposal.id}</p>
      </div>
    </div>
  );
}

function CtaModal() {
  return (
    <div className="flex w-fit flex-col space-y-2 border border-taupe-300 bg-taupe-100 bg-diamond-texture bg-right-bottom py-2.5 pl-4 pr-8 md:pr-14">
      <h2 className="font-serif text-xl">Get Involved</h2>
      <ExternalLink
        href={links.docs}
        className="flex items-center space-x-2 text-sm font-medium hover:underline"
      >
        <div className="w-4">
          <Image src={BookIcon} alt="" />
        </div>
        <span>Explore the docs</span>
      </ExternalLink>
      <ExternalLink
        href={links.discord}
        className="flex items-center space-x-2 text-sm font-medium hover:underline"
      >
        <div className="w-4">
          <Image src={DiscordIcon} alt="" />
        </div>
        <span>Join the chat</span>
      </ExternalLink>
      <ExternalLink
        href={links.forum}
        className="flex  items-center space-x-2 text-sm font-medium hover:underline"
      >
        <div className="w-4 p-px">
          <Image src={CeloIcon} alt="" />
        </div>
        <span>Join the forum</span>
      </ExternalLink>
    </div>
  );
}

function useFilteredProposals({
  proposals,
  filter,
  searchQuery,
}: {
  proposals?: Proposal[];
  filter: Filter;
  searchQuery: string;
}) {
  return useMemo<Proposal[] | undefined>(() => {
    if (!proposals) return undefined;
    const query = searchQuery.trim().toLowerCase();
    return proposals
      .filter((p) => {
        if (filter === Filter.Upvoting) return p.stage === ProposalStage.Queued;
        if (filter === Filter.Voting) return p.stage === ProposalStage.Referendum;
        if (filter === Filter.Drafts) return p.stage === ProposalStage.None;
        if (filter === Filter.History)
          return p.stage === ProposalStage.Expiration || p.stage === ProposalStage.Execution;
        return true;
      })
      .filter((p) => !query || p.url.includes(query))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [proposals, filter, searchQuery]);
}
