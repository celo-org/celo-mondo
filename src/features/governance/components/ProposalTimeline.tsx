import clsx from 'clsx';
import {
  EXECUTION_STAGE_EXPIRY_TIME,
  QUEUED_STAGE_EXPIRY_TIME,
  REFERENDUM_STAGE_EXPIRY_TIME,
} from 'src/config/consts';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { useIsProposalPassingQuorum } from 'src/features/governance/hooks/useProposalQuorum';
import { ProposalStage } from 'src/features/governance/types';
import {
  getFullDateHumanDateString,
  getHumanReadableDuration,
  getUTCDateString,
} from 'src/utils/time';

type TimelineStepStatus = 'completed' | 'active' | 'future' | 'failed';

interface TimelineStep {
  label: string;
  status: TimelineStepStatus;
  startTime?: number;
  endTime?: number;
  timestamp?: number;
  isEvent?: boolean;
}

function buildTimelineSteps(
  propData: MergedProposalData,
  quorumMet: boolean | null,
): TimelineStep[] {
  const { stage, queuedAt, dequeuedAt, approvedAt, executedAt, transactionCount } = propData;
  const steps: TimelineStep[] = [];

  const queuedMs = queuedAt ? new Date(queuedAt).getTime() : undefined;
  const dequeuedMs = dequeuedAt ? new Date(dequeuedAt).getTime() : undefined;
  const approvedMs = approvedAt ? new Date(approvedAt).getTime() : undefined;
  const executedMs = executedAt ? new Date(executedAt).getTime() : undefined;

  if (!queuedMs && !dequeuedMs) return steps;

  // Step 1: Upvoting
  const upvotingEnd = queuedMs ? queuedMs + QUEUED_STAGE_EXPIRY_TIME : undefined;
  const upvotingStatus: TimelineStepStatus =
    stage === ProposalStage.Queued
      ? 'active'
      : stage > ProposalStage.Queued
        ? 'completed'
        : 'future';
  steps.push({
    label: 'Upvoting',
    status: upvotingStatus,
    startTime: queuedMs,
    endTime: upvotingEnd,
  });

  // Step 2: Voting
  const votingEnd = dequeuedMs ? dequeuedMs + REFERENDUM_STAGE_EXPIRY_TIME : undefined;
  // If we don't have dequeuedAt but the proposal progressed past Referendum, it's completed
  const pastReferendum = stage > ProposalStage.Referendum;
  const votingStatus: TimelineStepStatus = dequeuedMs
    ? stage === ProposalStage.Referendum
      ? 'active'
      : pastReferendum
        ? 'completed'
        : 'future'
    : pastReferendum
      ? 'completed'
      : 'future';
  steps.push({
    label: 'Voting',
    status: votingStatus,
    startTime: dequeuedMs,
    endTime: votingEnd,
  });

  const executionEnd = dequeuedMs
    ? dequeuedMs + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME
    : undefined;

  // Determine which post-voting phases to show based on how the proposal ended.
  // Rejected = quorum not met, so it never reached approval/execution.
  // Expired without approval (and has txns) = approval was missed, execution unreachable.
  // Withdrawn = could happen at any point, skip approval/execution.
  const isRejected = stage === ProposalStage.Rejected;
  const isWithdrawn = stage === ProposalStage.Withdrawn;
  const approvalMissed =
    !approvedMs &&
    stage === ProposalStage.Expiration &&
    transactionCount != null &&
    transactionCount > 0;
  // Skip Approved + Execution for proposals that never reached those phases
  const skipPostVoting = isRejected || isWithdrawn;

  // Step 2.5: Approval
  // If the proposal reached Execution/Executed/Adopted, approval must have happened
  // even if approvedAt is missing from the DB (older proposals)
  const approvalImplied =
    !approvedMs &&
    (stage === ProposalStage.Execution ||
      stage === ProposalStage.Executed ||
      stage === ProposalStage.Adopted);
  if (!skipPostVoting) {
    if (approvedMs) {
      steps.push({
        label: 'Approved',
        status: 'completed',
        timestamp: approvedMs,
        isEvent: true,
      });
    } else if (approvalImplied) {
      steps.push({
        label: 'Approved',
        status: 'completed',
        isEvent: true,
      });
    } else if (approvalMissed) {
      steps.push({
        label: 'Approval Missed',
        status: 'failed',
        isEvent: true,
      });
    } else {
      // Show pending approval for active proposals
      steps.push({
        label: 'Approval',
        status: 'future',
        isEvent: true,
      });
    }
  }

  // Step 3: Execution
  // Skip if: rejected, withdrawn, approval missed, or adopted (0 txns = no execution needed)
  const isAdopted = stage === ProposalStage.Adopted;
  const skipExecution = skipPostVoting || approvalMissed || isAdopted;
  if (!skipExecution) {
    const isActiveExecution = stage === ProposalStage.Execution || stage === ProposalStage.Approval;
    const isCompletedExecution =
      (approvedMs || !dequeuedMs) &&
      (stage === ProposalStage.Executed || stage === ProposalStage.Expiration);
    const executionStatus: TimelineStepStatus = isActiveExecution
      ? 'active'
      : isCompletedExecution
        ? 'completed'
        : 'future';
    steps.push({
      label: 'Execution',
      status: executionStatus,
      startTime: votingEnd,
      endTime: executionEnd,
    });
  }

  // Step 4: Terminal state
  if (stage === ProposalStage.Executed) {
    steps.push({
      label: 'Executed',
      status: 'completed',
      timestamp: executedMs,
      isEvent: true,
    });
  } else if (isAdopted) {
    steps.push({
      label: 'Adopted',
      status: 'completed',
      timestamp: executedMs,
      isEvent: true,
    });
  } else if (isRejected) {
    steps.push({
      label: 'Rejected',
      status: 'failed',
      timestamp: votingEnd,
      isEvent: true,
    });
  } else if (isWithdrawn) {
    steps.push({
      label: 'Withdrawn',
      status: 'failed',
      isEvent: true,
    });
  } else if (stage === ProposalStage.Expiration) {
    const expiredAt = quorumMet ? executionEnd : votingEnd;
    steps.push({
      label: 'Expired',
      status: 'failed',
      timestamp: expiredAt,
      isEvent: true,
    });
  } else {
    // Still in progress — show future Expiration
    steps.push({
      label: 'Expiration',
      status: 'future',
      endTime: executionEnd,
    });
  }

  return steps;
}

function TimelineTime({ timestamp }: { timestamp: number }) {
  const localStr = getFullDateHumanDateString(timestamp);
  const utcStr = getUTCDateString(timestamp);

  return (
    <span className="tooltip cursor-default text-xs text-taupe-600" data-tip={utcStr}>
      {localStr}
    </span>
  );
}

function ActiveCountdown({ endTime, label }: { endTime: number; label: string }) {
  const now = Date.now();
  const remaining = endTime - now;
  const isPast = remaining < 0;

  if (isPast) {
    return (
      <div className="text-xs text-taupe-600">
        {label === 'Upvoting' ? 'Expired' : 'Ended'} <TimelineTime timestamp={endTime} />
      </div>
    );
  }

  return (
    <div className="text-xs text-purple-300">
      {label === 'Upvoting' ? 'Expires' : 'Ends'} in {getHumanReadableDuration(remaining)}
    </div>
  );
}

export function ProposalTimeline({ propData }: { propData: MergedProposalData }) {
  const { quorumMet } = useIsProposalPassingQuorum(propData);
  const steps = buildTimelineSteps(propData, quorumMet);

  if (steps.length === 0) return null;

  return (
    <div className="max-w-[340px] py-2">
      <ol className="relative">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={`${step.label}-${i}`} className={clsx('flex', !isLast && 'pb-4')}>
              {/* Dot + line column */}
              <div className="relative mr-3 flex flex-col items-center">
                {/* Dot */}
                <div
                  className={clsx(
                    'mt-0.5 flex-shrink-0 rounded-full',
                    step.isEvent ? 'h-2 w-2' : 'h-3 w-3',
                    step.status === 'completed' && 'bg-green-500',
                    step.status === 'failed' && 'bg-red-500',
                    step.status === 'active' &&
                      'animate-pulse bg-purple-300 ring-2 ring-purple-200',
                    step.status === 'future' && 'bg-taupe-300',
                  )}
                />
                {/* Connecting line */}
                {!isLast && (
                  <div
                    className={clsx(
                      'mt-1 w-0 flex-1 border-l-2',
                      step.status === 'completed'
                        ? 'border-green-500'
                        : step.status === 'failed'
                          ? 'border-red-500'
                          : 'border-taupe-300',
                    )}
                  />
                )}
              </div>

              {/* Content column */}
              <div className="min-w-0 flex-1 pb-1">
                <div
                  className={clsx(
                    'text-sm font-medium',
                    step.status === 'active' && 'text-purple-500',
                    step.status === 'completed' && 'text-green-700',
                    step.status === 'failed' && 'text-red-500',
                    step.status === 'future' && 'text-taupe-400',
                  )}
                >
                  {step.label}
                </div>

                {/* Event timestamp */}
                {step.isEvent && step.timestamp && <TimelineTime timestamp={step.timestamp} />}

                {/* Phase time range */}
                {!step.isEvent && step.startTime && <TimelineTime timestamp={step.startTime} />}

                {/* Active countdown */}
                {step.status === 'active' && step.endTime && (
                  <ActiveCountdown endTime={step.endTime} label={step.label} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
