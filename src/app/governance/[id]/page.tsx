'use client';

import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ColoredChartDataItem, StackedBarChart } from 'src/components/charts/StackedBarChart';
import { HelpIcon } from 'src/components/icons/HelpIcon';
import { Section } from 'src/components/layout/Section';
import { Amount, formatNumberString } from 'src/components/numbers/Amount';
import { links } from 'src/config/links';
import { ProposalBadgeRow } from 'src/features/governance/ProposalCard';
import {
  ProposalStage,
  VoteToColor,
  VoteValue,
  VoteValues,
} from 'src/features/governance/contractTypes';
import {
  MergedProposalData,
  useGovernanceProposals,
} from 'src/features/governance/useGovernanceProposals';
import { useProposalContent } from 'src/features/governance/useProposalContent';
import { Color } from 'src/styles/Color';
import { fromWei } from 'src/utils/amount';
import { bigIntSum, percent } from 'src/utils/math';
import { usePageInvariant } from 'src/utils/navigation';
import { toTitleCase, trimToLength } from 'src/utils/strings';
import { getHumanReadableDuration } from 'src/utils/time';
import styles from './styles.module.css';

const ID_PARAM_REGEX = /^(cgp-)?(\d+)$/;

export const dynamicParams = true;

export default function Page({ params: { id } }: { params: { id: string } }) {
  const { proposals } = useGovernanceProposals();

  const proposal = useMemo(() => {
    if (!proposals || !id) return undefined;
    const matches = ID_PARAM_REGEX.exec(id);
    if (matches?.length === 2) {
      const propId = parseInt(matches[1]);
      return proposals.find((p) => p.proposal?.id === propId);
    } else if (matches?.length === 3) {
      const cgpId = parseInt(matches[2]);
      return proposals.find((p) => p.metadata?.cgp === cgpId);
    } else {
      return undefined;
    }
  }, [proposals, id]);

  usePageInvariant(!proposals || proposal, '/governance', 'Proposal not found');

  if (!proposal) {
    return <FullWidthSpinner>Loading proposals</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="space-y-4 mt-4">
      <div className="flex flex-col items-stretch md:flex-row md:gap-6">
        <ProposalContent data={proposal} />
        <ProposalChainData data={proposal} />
      </div>
    </Section>
  );
}

function ProposalContent({ data }: { data: MergedProposalData }) {
  const { proposal, metadata } = data;
  const title = trimToLength(metadata?.title || `Proposal #${proposal?.id}`, 80);

  const { content, isLoading } = useProposalContent(metadata);

  return (
    <div className="space-y-3">
      <BackLink href="/governance">Browse proposals</BackLink>
      <h1 className="font-serif text-2xl md:text-2xl">{title}</h1>
      <ProposalBadgeRow data={data} showProposer />
      {isLoading && !content && <FullWidthSpinner>Loading proposal content</FullWidthSpinner>}
      {!isLoading && !content && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <p className="text-center text-taupe-600">No CGP content found for this proposal</p>
          <p className="text-center text-taupe-600">
            Check the{' '}
            <ExternalLink href={links.governance} className="underline">
              Celo Governance repository
            </ExternalLink>{' '}
            for more information
          </p>
        </div>
      )}
      {content && (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          className={`max-w-screen-md space-y-4 pb-4 ${styles.proposal}`}
        ></div>
      )}
    </div>
  );
}

function ProposalChainData({ data }: { data: MergedProposalData }) {
  if (!data.proposal) return null;

  const { proposal, stage } = data;
  const { expiryTimestamp } = proposal;

  return (
    <div className="space-y-4">
      <div className="space-y-4 border border-taupe-300 p-3">
        {stage === ProposalStage.Queued && <UpvoteButton />}
        {stage === ProposalStage.Referendum && <VoteButtons />}
        {expiryTimestamp && (
          <div>{`Voting ends in ${getHumanReadableDuration(expiryTimestamp)}`}</div>
        )}
        {stage >= ProposalStage.Referendum && <VoteChart data={data} />}
      </div>
      <div className="border border-taupe-300 p-3">
        <h2>Results</h2>
      </div>
      <div className="border border-taupe-300 p-3">
        <h2>Voters</h2>
      </div>
    </div>
  );
}

function UpvoteButton() {
  // todo tx modal here

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Upvote</h2>
        <VotingPower />
      </div>
      <SolidButton className="btn-neutral">{`👍 Upvote`}</SolidButton>
    </>
  );
}

function VoteButtons() {
  // todo tx modal here

  return (
    <>
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Vote</h2>
        <VotingPower />
      </div>
      <div className="flex items-center justify-between gap-2 md:flex-col md:items-stretch">
        <SolidButton className="btn-neutral">{`👍 Yes`}</SolidButton>
        <SolidButton className="btn-neutral">{`👎 No`}</SolidButton>
        <SolidButton className="btn-neutral">{`⚪ Abstain`}</SolidButton>
      </div>
    </>
  );
}

function VoteChart({ data: { proposal } }: { data: MergedProposalData }) {
  // TODO historic votes from celoscan
  const votes = proposal?.votes;
  const yesVotes = votes?.[VoteValue.Yes] || 0n;
  const totalVotes = bigIntSum(Object.values(votes || {}));
  const quorumRequired = 1000000000000000000000n;
  const voteBarChartData = useMemo(
    () =>
      VoteValues.reduce(
        (acc, v) => {
          acc[v] = {
            label: '',
            value: fromWei(votes?.[v] || 0n),
            percentage: percent(votes?.[v] || 0n, totalVotes),
            color: VoteToColor[v],
          };
          return acc;
        },
        {} as Record<VoteValue, ColoredChartDataItem>,
      ),
    [votes, totalVotes],
  );
  const quorumBarChartData = useMemo(
    () => [
      {
        label: 'Yes votes',
        value: fromWei(yesVotes),
        percentage: percent(yesVotes, quorumRequired),
        color: Color.Wood,
      },
    ],
    [yesVotes, quorumRequired],
  );

  if (!votes) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-8">
          <h2 className="font-serif text-2xl">Result</h2>
          <div className="flex items-center text-sm">
            {`Required: ${'TODO'}%`}
            <HelpIcon text="Depending on the value or function being modified, different quorum and approval settings are required." />
          </div>
        </div>
        <div className="space-y-2">
          {Object.values(VoteValues).map((v) => (
            <div key={v} className="relative text-xs">
              <StackedBarChart data={[voteBarChartData[v]]} showBorder={false} height="h-7" />
              <span className="absolute left-2 top-1/2 -translate-y-1/2">{toTitleCase(v)}</span>
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <span className="text-gray-500">
                  {formatNumberString(voteBarChartData[v].value)}
                </span>
                <span>{voteBarChartData[v].percentage?.toFixed(0) + '%'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {quorumRequired && (
        <div className="space-y-2 border-t border-taupe-300 pt-2">
          <Amount valueWei={proposal.votes[VoteValue.Yes]} className="text-2xl" decimals={0} />
          <StackedBarChart data={quorumBarChartData} showBorder={false} />
          <div className="flex items-center text-sm">
            {`Quorum required: ${formatNumberString(quorumRequired, 0, true)}`}
          </div>
        </div>
      )}
    </>
  );
}

function VotingPower() {
  // TODO compute (account for delegation)
  return (
    <div className="flex items-center text-sm">
      {`Voting power: ${formatNumberString(0)} CELO `}
      <HelpIcon text="Voting power is the amount of CELO you have locked plus/minus any you have delegated to/from you" />
    </div>
  );
}
