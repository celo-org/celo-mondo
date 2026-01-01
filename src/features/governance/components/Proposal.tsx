'use client';

import { useMemo } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { BackLink } from 'src/components/buttons/BackLink';
import { ErrorBoundaryInline } from 'src/components/errors/ErrorBoundaryInline';
import { CollapsibleResponsiveMenu } from 'src/components/menus/CollapsibleResponsiveMenu';
import { links } from 'src/config/links';
import { ProposalApprovalsTable } from 'src/features/governance/components/ProposalApprovalsTable';
import { ProposalBadgeRow, ProposalLinkRow } from 'src/features/governance/components/ProposalCard';
import { ProposalUpvotersTable } from 'src/features/governance/components/ProposalUpvotersTable';
import {
  ProposalUpvoteButton,
  ProposalVoteButtons,
} from 'src/features/governance/components/ProposalVoteButtons';
import {
  PastProposalVoteChart,
  ProposalQuorumChart,
  ProposalVoteChart,
} from 'src/features/governance/components/ProposalVoteChart';
import { ProposalVotersTable } from 'src/features/governance/components/ProposalVotersTable';
import { MergedProposalData, findProposal } from 'src/features/governance/governanceData';
import { useGovernanceProposals } from 'src/features/governance/hooks/useGovernanceProposals';
import { useProposalContent } from 'src/features/governance/hooks/useProposalContent';
import { useIsProposalPassingQuorum } from 'src/features/governance/hooks/useProposalQuorum';
import { ProposalStage } from 'src/features/governance/types';
import { usePageInvariant } from 'src/utils/navigation';
import { trimToLength } from 'src/utils/strings';
import { getHumanEndTime } from 'src/utils/time';
import { ProposalTransactions } from './ProposalTransactions';
import styles from './styles.module.css';

export function Proposal({ id }: { id: string }) {
  const { proposals, isLoading } = useGovernanceProposals();

  const propData = useMemo(() => findProposal(proposals, id), [proposals, id]);
  usePageInvariant(isLoading || propData, '/governance', 'Proposal not found');

  if (!propData) {
    return <FullWidthSpinner>Loading proposals</FullWidthSpinner>;
  }

  return (
    <>
      <ProposalContent propData={propData} id={id} />
      {propData.stage !== ProposalStage.None && (
        <CollapsibleResponsiveMenu defaultCollapsed={propData.stage !== ProposalStage.Referendum}>
          <ProposalChainData propData={propData} />
        </CollapsibleResponsiveMenu>
      )}
    </>
  );
}

function ProposalContent({ propData, id }: { propData: MergedProposalData; id: string }) {
  const { proposal, metadata } = propData;
  const title = trimToLength(metadata?.title || `Proposal #${proposal?.id}`, 80);
  const { content, isLoading } = useProposalContent(metadata);

  return (
    <div className="space-y-3">
      <BackLink href="/governance">Browse proposals</BackLink>
      <h1 className="font-serif text-2xl md:text-2xl">{title}</h1>
      <ProposalBadgeRow propData={propData} showProposer showExecutedTime />
      <ProposalLinkRow propData={propData} />
      {isLoading && !content && <FullWidthSpinner>Loading proposal content</FullWidthSpinner>}
      {!isLoading && !content && (
        <div className="flex flex-col items-start justify-center space-y-3 py-6">
          <p className="text-taupe-600">
            No valid CGP data found for this proposal. It may be missing or malformed.
          </p>
          <p className="text-taupe-600">You can still upvote and/or vote for this proposal.</p>
          <p className="text-taupe-600">
            See the{' '}
            <A_Blank href={links.governance} className="underline">
              Celo Governance repository
            </A_Blank>{' '}
            for more information.
          </p>
        </div>
      )}

      <div className={`flex flex-col gap-4 pb-4 ${styles.proposal}`}>
        <ErrorBoundaryInline>
          <ProposalTransactions proposalId={id} numTransactions={proposal?.numTransactions} />
        </ErrorBoundaryInline>
        {content && <div dangerouslySetInnerHTML={{ __html: content }} className="space-y-4"></div>}
      </div>
    </div>
  );
}

function ProposalChainData({ propData }: { propData: MergedProposalData }) {
  const {
    id: proposalId,
    stage,
    history,
    queuedAt,
    dequeuedAt,
    executedAt,
    transactionCount,
  } = propData;
  const { quorumMet } = useIsProposalPassingQuorum(propData);

  if (stage === ProposalStage.None) return null;

  return (
    <div className="w-full space-y-4 xl:w-[26rem]">
      <div className="space-y-4 border-taupe-300 p-3 lg:border">
        {stage === ProposalStage.Queued && <ProposalUpvoteButton proposalId={proposalId} />}
        {stage === ProposalStage.Referendum && <ProposalVoteButtons proposalId={proposalId} />}
        {stage >= ProposalStage.Approval && <ProposalVoteChart propData={propData} />}
        {stage >= ProposalStage.Approval && <ProposalQuorumChart propData={propData} />}
        <div className="max-w-[340px] space-y-2">
          <div className="text-sm text-taupe-600">
            {getHumanEndTime({
              stage,
              queuedAt,
              dequeuedAt,
              executedAt,
              quorumMet,
            })}
          </div>
        </div>
      </div>
      {stage === ProposalStage.Queued && (
        <div className="border-taupe-300 p-3 lg:block lg:border">
          <ProposalUpvotersTable propData={propData} />
        </div>
      )}
      {stage >= ProposalStage.Approval && (
        <div className="overflow-auto border-taupe-300 p-3 lg:block lg:border">
          <ErrorBoundaryInline>
            <ProposalVotersTable propData={propData} />
          </ErrorBoundaryInline>
        </div>
      )}
      {stage >= ProposalStage.Referendum && proposalId && (
        <div className="border-taupe-300 p-3 lg:block lg:border">
          <ErrorBoundaryInline>
            <ProposalApprovalsTable
              proposalId={proposalId}
              stage={stage}
              transactionCount={transactionCount}
            />
          </ErrorBoundaryInline>
        </div>
      )}
      {history && history.length > 0 && (
        <div className="hidden space-y-4 border-taupe-300 p-3 md:block lg:border">
          <h2 className="font-serif text-2xl">Past Onchain Results</h2>
          {history.map(({ id, stage }) => (
            <ErrorBoundaryInline key={id}>
              <PastProposalVoteChart title={`As #${id}`} id={id} stage={stage} />
            </ErrorBoundaryInline>
          ))}
        </div>
      )}
    </div>
  );
}
