'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { getStageEndTimestamp } from 'src/features/governance/governanceData';
import { ProposalStage } from 'src/features/governance/types';

interface TimelineStage {
  label: string;
  timestamp: string | number | null;
  isActive: boolean;
  isPast: boolean;
  isFailed?: boolean;
}

interface ProposalStageTimelineProps {
  stage: ProposalStage;
  queuedAt: string | null;
  dequeuedAt: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  quorumMet: boolean | null;
}

function formatTimestamp(timestamp: string | number | null, useUtc: boolean): string | null {
  if (!timestamp) return null;
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: useUtc ? 'UTC' : undefined,
  });
  const formatted = formatter.format(date);
  return useUtc ? `${formatted} UTC` : formatted;
}

function formatCurrentTime(useUtc: boolean): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: useUtc ? 'UTC' : undefined,
  });
  const formatted = formatter.format(now);
  return useUtc ? `${formatted} UTC` : formatted;
}

function TimezoneToggle({
  useUtc,
  onToggle,
}: {
  useUtc: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative flex h-6 w-24 cursor-pointer items-center rounded-full bg-taupe-200 p-0.5 transition-colors"
      aria-label={`Switch to ${useUtc ? 'local' : 'UTC'} time`}
    >
      {/* Sliding pill */}
      <span
        className={clsx(
          'absolute h-5 w-11 rounded-full bg-white shadow-sm transition-transform duration-200',
          useUtc ? 'translate-x-[50px]' : 'translate-x-0',
        )}
      />
      {/* Labels */}
      <span
        className={clsx(
          'relative z-10 flex-1 text-center text-xs font-medium transition-colors',
          !useUtc ? 'text-taupe-800' : 'text-taupe-500',
        )}
      >
        Local
      </span>
      <span
        className={clsx(
          'relative z-10 flex-1 text-center text-xs font-medium transition-colors',
          useUtc ? 'text-taupe-800' : 'text-taupe-500',
        )}
      >
        UTC
      </span>
    </button>
  );
}

function formatClockTime(useUtc: boolean): { time: string; period: string; date: string } {
  const now = new Date();
  
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: useUtc ? 'UTC' : undefined,
  });
  
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: useUtc ? 'UTC' : undefined,
  });
  
  return {
    time: timeFormatter.format(now),
    period: useUtc ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'Local',
    date: dateFormatter.format(now),
  };
}

function CurrentTimeClock({ useUtc }: { useUtc: boolean }) {
  const [clock, setClock] = useState<{ time: string; period: string; date: string } | null>(null);

  useEffect(() => {
    // Initial update
    setClock(formatClockTime(useUtc));
    
    // Update every second
    const interval = setInterval(() => {
      setClock(formatClockTime(useUtc));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [useUtc]);

  if (!clock) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
      {/* Live indicator */}
      <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </div>
      
      {/* Time and date */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">
            Current Time
          </span>
          <span className="text-[10px] font-medium text-green-600">
            ({clock.period})
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold text-taupe-600">
            {clock.time}
          </span>
          <span className="text-xs text-taupe-500">
            {clock.date}
          </span>
        </div>
      </div>
    </div>
  );
}

function getHumanReadableDuration(ms: number) {
  let seconds = Math.round(ms / 1000);
  if (seconds <= 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function formatStatusDate(timestamp: number, useUtc: boolean): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: useUtc ? 'UTC' : undefined,
    timeZoneName: 'short',
  });
  return formatter.format(timestamp);
}

interface StatusInfo {
  label: string;
  timeLeft: string | null;
  endDate: string;
  isPast: boolean;
  isActive: boolean;
}

function getStatusInfo(
  stage: ProposalStage,
  queuedAt: string | null,
  dequeuedAt: string | null,
  executedAt: string | null,
  quorumMet: boolean | null,
  useUtc: boolean,
): StatusInfo | null {
  const now = Date.now();
  
  switch (stage) {
    case ProposalStage.Queued: {
      if (!queuedAt) return null;
      const endDate = getStageEndTimestamp(stage, new Date(queuedAt).getTime());
      if (!endDate) return null;
      const isPast = endDate - now < 0;
      return {
        label: isPast ? 'Expired' : 'Expires',
        timeLeft: isPast ? null : getHumanReadableDuration(endDate - now),
        endDate: formatStatusDate(endDate, useUtc),
        isPast,
        isActive: true,
      };
    }
    case ProposalStage.Referendum: {
      if (!dequeuedAt) return null;
      const endDate = getStageEndTimestamp(stage, new Date(dequeuedAt).getTime());
      if (!endDate) return null;
      const isPast = endDate - now < 0;
      return {
        label: isPast ? 'Voting ended' : 'Voting ends',
        timeLeft: isPast ? null : getHumanReadableDuration(endDate - now),
        endDate: formatStatusDate(endDate, useUtc),
        isPast,
        isActive: true,
      };
    }
    case ProposalStage.Approval:
    case ProposalStage.Execution: {
      if (!dequeuedAt) return null;
      const endDate = getStageEndTimestamp(stage, new Date(dequeuedAt).getTime());
      if (!endDate) return null;
      const isPast = endDate - now < 0;
      return {
        label: isPast ? 'Execution window closed' : 'Execute by',
        timeLeft: isPast ? null : getHumanReadableDuration(endDate - now),
        endDate: formatStatusDate(endDate, useUtc),
        isPast,
        isActive: true,
      };
    }
    case ProposalStage.Rejected: {
      if (!dequeuedAt) return null;
      const endDate = getStageEndTimestamp(ProposalStage.Referendum, new Date(dequeuedAt).getTime());
      if (!endDate) return null;
      return {
        label: 'Rejected',
        timeLeft: null,
        endDate: formatStatusDate(endDate, useUtc),
        isPast: true,
        isActive: false,
      };
    }
    case ProposalStage.Expiration: {
      const _stage = quorumMet ? ProposalStage.Expiration : ProposalStage.Referendum;
      const baseTime = dequeuedAt ? new Date(dequeuedAt).getTime() : null;
      if (!baseTime) return null;
      const endDate = getStageEndTimestamp(_stage, baseTime);
      if (!endDate) return null;
      return {
        label: 'Expired',
        timeLeft: null,
        endDate: formatStatusDate(endDate, useUtc),
        isPast: true,
        isActive: false,
      };
    }
    case ProposalStage.Executed: {
      if (!executedAt) return null;
      return {
        label: 'Executed',
        timeLeft: null,
        endDate: formatStatusDate(new Date(executedAt).getTime(), useUtc),
        isPast: true,
        isActive: false,
      };
    }
    default:
      return null;
  }
}

function ProposalStatusBanner({ 
  stage, 
  queuedAt, 
  dequeuedAt, 
  executedAt, 
  quorumMet, 
  useUtc 
}: { 
  stage: ProposalStage;
  queuedAt: string | null;
  dequeuedAt: string | null;
  executedAt: string | null;
  quorumMet: boolean | null;
  useUtc: boolean;
}) {
  const status = getStatusInfo(stage, queuedAt, dequeuedAt, executedAt, quorumMet, useUtc);
  
  if (!status) return null;

  return (
    <div className={clsx(
      'rounded-lg border px-3 py-2',
      status.isActive && !status.isPast && 'border-purple-200 bg-purple-50',
      status.isActive && status.isPast && 'border-yellow-500/30 bg-yellow-500/10',
      !status.isActive && 'border-taupe-300 bg-taupe-100',
    )}>
      <div className="flex items-center gap-2">
        {status.isActive && !status.isPast && (
          <div className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-300" />
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span className={clsx(
              'text-sm font-semibold',
              status.isActive && !status.isPast && 'text-purple-500',
              status.isActive && status.isPast && 'text-taupe-600',
              !status.isActive && 'text-taupe-600',
            )}>
              {status.label}
            </span>
            {status.timeLeft && (
              <>
                <span className="text-sm text-purple-500">in</span>
                <span className="font-mono text-sm font-bold text-purple-500">
                  {status.timeLeft}
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-taupe-500">
            {status.endDate}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProposalStageTimeline({
  stage,
  queuedAt,
  dequeuedAt,
  approvedAt,
  executedAt,
  quorumMet,
}: ProposalStageTimelineProps) {
  const [useUtc, setUseUtc] = useState(false);

  const isTerminalFailed =
    stage === ProposalStage.Expiration ||
    stage === ProposalStage.Rejected ||
    stage === ProposalStage.Withdrawn;

  const isTerminalSuccess =
    stage === ProposalStage.Executed || stage === ProposalStage.Adopted;

  // Stage durations (in ms)
  const REFERENDUM_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Build timeline stages based on available data
  const stages: TimelineStage[] = [];

  // Always show Queued if we have queuedAt
  if (queuedAt) {
    stages.push({
      label: 'Queued',
      timestamp: queuedAt,
      isActive: stage === ProposalStage.Queued,
      isPast: stage > ProposalStage.Queued,
    });
  }

  // Show Voting Started if we have dequeuedAt
  if (dequeuedAt) {
    stages.push({
      label: 'Voting Started',
      timestamp: dequeuedAt,
      isActive: stage === ProposalStage.Referendum,
      isPast: stage > ProposalStage.Referendum,
    });
    
    // Calculate Voting Ended timestamp (7 days after dequeue)
    const votingEndedTimestamp = new Date(dequeuedAt).getTime() + REFERENDUM_DURATION;
    
    // Show Voting Ended / Approved for proposals past referendum (not rejected)
    if (stage > ProposalStage.Referendum && stage !== ProposalStage.Rejected) {
      stages.push({
        label: 'Approved',
        timestamp: approvedAt || votingEndedTimestamp,
        isActive: stage === ProposalStage.Execution || stage === ProposalStage.Approval,
        isPast: isTerminalSuccess || isTerminalFailed,
      });
    }
  }

  // Show terminal state
  if (isTerminalSuccess && executedAt) {
    stages.push({
      label: 'Executed',
      timestamp: executedAt,
      isActive: false,
      isPast: true,
    });
  } else if (stage === ProposalStage.Rejected) {
    // Rejected happens when voting ends with No > Yes
    // Calculate based on referendum end time (7 days from dequeue)
    const rejectedTimestamp = dequeuedAt
      ? getStageEndTimestamp(ProposalStage.Referendum, new Date(dequeuedAt).getTime())
      : null;
    stages.push({
      label: 'Rejected',
      timestamp: rejectedTimestamp ?? null,
      isActive: false,
      isPast: true,
      isFailed: true,
    });
  } else if (stage === ProposalStage.Expiration) {
    // Calculate expiration timestamp based on which stage it expired from
    let expiredTimestamp: number | null = null;
    if (dequeuedAt) {
      // Expired from referendum or execution stage (10 days from dequeue)
      expiredTimestamp =
        getStageEndTimestamp(ProposalStage.Expiration, new Date(dequeuedAt).getTime()) ?? null;
    } else if (queuedAt) {
      // Expired from queue (28 days from queue)
      expiredTimestamp =
        getStageEndTimestamp(ProposalStage.Queued, new Date(queuedAt).getTime()) ?? null;
    }
    stages.push({
      label: 'Expired',
      timestamp: expiredTimestamp,
      isActive: false,
      isPast: true,
      isFailed: true,
    });
  } else if (stage === ProposalStage.Withdrawn) {
    stages.push({
      label: 'Withdrawn',
      timestamp: null,
      isActive: false,
      isPast: true,
      isFailed: true,
    });
  }

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-taupe-600">Timeline</h3>
        <TimezoneToggle useUtc={useUtc} onToggle={() => setUseUtc(!useUtc)} />
      </div>
      <ProposalStatusBanner 
        stage={stage}
        queuedAt={queuedAt}
        dequeuedAt={dequeuedAt}
        executedAt={executedAt}
        quorumMet={quorumMet}
        useUtc={useUtc}
      />
      <CurrentTimeClock useUtc={useUtc} />
      <div className="relative">
        {stages.map((s, index) => (
          <div key={s.label} className="relative flex items-start pb-4 last:pb-0">
            {/* Vertical line connecting stages */}
            {index < stages.length - 1 && (
              <div
                className={clsx(
                  'absolute left-[7px] top-4 h-full w-0.5',
                  s.isPast ? 'bg-taupe-400' : 'bg-taupe-200',
                )}
              />
            )}

            {/* Stage indicator dot */}
            <div
              className={clsx(
                'relative z-10 mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2',
                s.isFailed && 'border-red-400 bg-red-100',
                !s.isFailed && s.isActive && 'border-lavender bg-lavender/30',
                !s.isFailed && s.isPast && 'border-jade bg-jade/30',
                !s.isFailed && !s.isActive && !s.isPast && 'border-taupe-300 bg-white',
              )}
            />

            {/* Stage content */}
            <div className="ml-3 min-w-0 flex-1">
              <p
                className={clsx(
                  'text-sm font-medium',
                  s.isFailed && 'text-red-600',
                  !s.isFailed && s.isActive && 'text-lavender-800',
                  !s.isFailed && s.isPast && 'text-taupe-800',
                  !s.isFailed && !s.isActive && !s.isPast && 'text-taupe-400',
                )}
              >
                {s.label}
              </p>
              {s.timestamp && (
                <p className="text-xs text-taupe-500">{formatTimestamp(s.timestamp, useUtc)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
