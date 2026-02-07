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

  const queuedMs = queuedAt ? new Date(queuedAt).getTime() : undefined;
  const dequeuedMs = dequeuedAt ? new Date(dequeuedAt).getTime() : undefined;
  const approvedMs = approvedAt ? new Date(approvedAt).getTime() : undefined;
  const executedMs = executedAt ? new Date(executedAt).getTime() : undefined;

  if (!queuedMs && !dequeuedMs) return [];

  // Fallback: back-calculate dequeuedAt from executedAt or approvedAt when missing.
  const inferredDequeuedMs =
    dequeuedMs ||
    (executedMs
      ? executedMs - REFERENDUM_STAGE_EXPIRY_TIME - EXECUTION_STAGE_EXPIRY_TIME
      : approvedMs
        ? approvedMs - REFERENDUM_STAGE_EXPIRY_TIME
        : undefined);

  const votingEnd = inferredDequeuedMs
    ? inferredDequeuedMs + REFERENDUM_STAGE_EXPIRY_TIME
    : undefined;
  const executionEnd = inferredDequeuedMs
    ? inferredDequeuedMs + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME
    : undefined;

  const isRejected = stage === ProposalStage.Rejected;
  const isWithdrawn = stage === ProposalStage.Withdrawn;
  const isAdopted = stage === ProposalStage.Adopted;
  const pastReferendum = stage > ProposalStage.Referendum;
  const approvalImplied =
    !approvedMs &&
    (stage === ProposalStage.Execution ||
      stage === ProposalStage.Executed ||
      stage === ProposalStage.Adopted);
  const approvalMissed =
    !approvedMs &&
    stage === ProposalStage.Expiration &&
    transactionCount != null &&
    transactionCount > 0;
  const skipPostVoting = isRejected || isWithdrawn;
  const skipExecution = skipPostVoting || approvalMissed || isAdopted;

  // Build phases in fixed lifecycle order
  const phases: TimelineStep[] = [];

  // 1. Upvoting
  const upvotingEnd =
    stage === ProposalStage.Queued
      ? queuedMs
        ? queuedMs + QUEUED_STAGE_EXPIRY_TIME
        : undefined
      : inferredDequeuedMs || (queuedMs ? queuedMs + QUEUED_STAGE_EXPIRY_TIME : undefined);
  phases.push({
    label: 'Upvoting',
    status:
      stage === ProposalStage.Queued
        ? 'active'
        : stage > ProposalStage.Queued
          ? 'completed'
          : 'future',
    startTime: queuedMs,
    endTime: upvotingEnd,
  });

  // 2. Voting
  phases.push({
    label: 'Voting',
    status: dequeuedMs
      ? stage === ProposalStage.Referendum
        ? 'active'
        : pastReferendum
          ? 'completed'
          : 'future'
      : pastReferendum
        ? 'completed'
        : 'future',
    startTime: inferredDequeuedMs,
    endTime: votingEnd,
  });

  // 3. Execution (skip for rejected/withdrawn/approval-missed/adopted)
  if (!skipExecution) {
    const isActiveExecution = stage === ProposalStage.Execution || stage === ProposalStage.Approval;
    const isCompletedExecution =
      (approvedMs || approvalImplied) &&
      (stage === ProposalStage.Executed || stage === ProposalStage.Expiration);
    phases.push({
      label: 'Execution',
      status: isActiveExecution ? 'active' : isCompletedExecution ? 'completed' : 'future',
      startTime: votingEnd,
      endTime: executionEnd,
    });
  }

  // 4. Terminal
  if (stage === ProposalStage.Executed) {
    phases.push({ label: 'Executed', status: 'completed', timestamp: executedMs, isEvent: true });
  } else if (isAdopted) {
    phases.push({ label: 'Adopted', status: 'completed', timestamp: executedMs, isEvent: true });
  } else if (isRejected) {
    phases.push({ label: 'Rejected', status: 'failed', timestamp: votingEnd, isEvent: true });
  } else if (isWithdrawn) {
    phases.push({ label: 'Withdrawn', status: 'failed', isEvent: true });
  } else if (stage === ProposalStage.Expiration) {
    const expiredAt = quorumMet ? executionEnd : votingEnd;
    phases.push({ label: 'Expired', status: 'failed', timestamp: expiredAt, isEvent: true });
  } else {
    phases.push({ label: 'Expiration', status: 'future', endTime: executionEnd });
  }

  // Insert approval event into the timeline
  if (!skipPostVoting) {
    if (approvedMs) {
      // Approved with timestamp — insert at chronological position
      const insertIdx = phases.findIndex(
        (p) => (p.startTime ?? p.timestamp ?? Infinity) > approvedMs,
      );
      phases.splice(insertIdx === -1 ? phases.length : insertIdx, 0, {
        label: 'Approved',
        status: 'completed',
        timestamp: approvedMs,
        isEvent: true,
      });
    } else if (approvalImplied) {
      // No timestamp but must have happened — insert before Execution
      const execIdx = phases.findIndex((p) => p.label === 'Execution');
      if (execIdx !== -1) {
        phases.splice(execIdx, 0, {
          label: 'Approved',
          status: 'completed',
          isEvent: true,
        });
      }
    } else if (approvalMissed) {
      // Insert after Voting
      const votingIdx = phases.findIndex((p) => p.label === 'Voting');
      phases.splice(votingIdx + 1, 0, {
        label: 'Approval Missed',
        status: 'failed',
        isEvent: true,
      });
    } else if (stage === ProposalStage.Execution || stage === ProposalStage.Approval) {
      // In execution phase but not yet approved — show after Execution
      const execIdx = phases.findIndex((p) => p.label === 'Execution');
      if (execIdx !== -1) {
        phases.splice(execIdx + 1, 0, {
          label: 'Approval',
          status: 'future',
          isEvent: true,
        });
      }
    } else {
      // Voting or earlier — show pending approval before Execution
      const execIdx = phases.findIndex((p) => p.label === 'Execution');
      if (execIdx !== -1) {
        phases.splice(execIdx, 0, {
          label: 'Approval',
          status: 'future',
          isEvent: true,
        });
      }
    }
  }

  return phases;
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
            <li
              key={`${step.label}-${i}`}
              className={clsx('flex', !isLast && (step.isEvent ? 'pb-2' : 'pb-4'))}
            >
              {/* Dot + line column */}
              <div
                className={clsx(
                  'relative flex flex-col items-center',
                  step.isEvent ? 'ml-1 mr-2' : 'mr-3',
                )}
              >
                {/* Dot */}
                <div
                  className={clsx(
                    'mt-1 flex-shrink-0 rounded-full',
                    step.isEvent ? 'h-1.5 w-1.5' : 'h-3 w-3',
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
                    step.isEvent ? 'text-xs italic' : 'text-sm font-medium',
                    step.status === 'active' && 'text-purple-500',
                    step.status === 'completed' && 'text-green-700',
                    step.status === 'failed' && 'text-red-500',
                    step.status === 'future' && 'text-taupe-400',
                  )}
                >
                  {step.label}
                  {/* Inline timestamp for events */}
                  {step.isEvent && step.timestamp && (
                    <>
                      {' — '}
                      <TimelineTime timestamp={step.timestamp} />
                    </>
                  )}
                </div>

                {/* Phase start time */}
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
