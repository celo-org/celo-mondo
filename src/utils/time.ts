import { getExpiryTimestamp } from 'src/features/governance/governanceData';
import { ProposalStage } from 'src/features/governance/types';

export function areDatesSameDay(d1: Date, d2: Date) {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

export function getDaysBetween(timestamp1: number, timestamp2: number) {
  return Math.round((timestamp2 - timestamp1) / (1000 * 60 * 60 * 24));
}

// Inspired by https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site
export function getHumanReadableTimeString(timestamp: number) {
  if (timestamp <= 0) return '';

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds <= 1) {
    return 'Just now';
  }
  if (seconds <= 60) {
    return `${seconds} seconds ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes <= 1) {
    return '1 minute ago';
  }
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours <= 1) {
    return '1 hour ago';
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const date = new Date(timestamp);
  return `on ${date.toLocaleDateString()}`;
}

export function getHumanReadableDuration(ms: number, minSec?: number) {
  let seconds = Math.round(ms / 1000);

  if (minSec) {
    seconds = Math.max(seconds, minSec);
  }

  if (seconds <= 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hours`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function getFullDateHumanDateString(timestamp: number) {
  const formatter = Intl.DateTimeFormat(undefined, {
    minute: 'numeric',
    hour: 'numeric',
    day: '2-digit',
    weekday: 'short',
    month: 'short',
    hour12: false,
    timeZoneName: 'short',
  });
  return formatter.format(timestamp);
}

export function getDateTimeString(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString()} ${getFullDateHumanDateString(timestamp)}`;
}

export function getEndHumanEndTime({
  stageStartTimestamp,
  stage,
}: {
  stageStartTimestamp: number | undefined;
  stage: ProposalStage | undefined;
}): string | undefined {
  const now = Date.now();

  if (!stageStartTimestamp || !stage) {
    return undefined;
  }

  switch (stage) {
    case ProposalStage.Queued:
    case ProposalStage.Referendum: {
      const endDate = getExpiryTimestamp(stage, stageStartTimestamp)!;
      return `Expires in ${getHumanReadableDuration(endDate - now)} on ${getFullDateHumanDateString(endDate)}`;
    }
    case ProposalStage.Approval: {
      const endDate = getExpiryTimestamp(ProposalStage.Approval, stageStartTimestamp)!;
      return `Passed on ${getFullDateHumanDateString(stageStartTimestamp)} to be approved before ${getFullDateHumanDateString(endDate)}`;
    }
    case ProposalStage.Execution: {
      return `Approved on ${getFullDateHumanDateString(stageStartTimestamp)}`;
    }
    case ProposalStage.Withdrawn:
    case ProposalStage.Rejected:
    case ProposalStage.Expiration: {
      return `Expired ${getHumanReadableTimeString(stageStartTimestamp)}`;
    }
    case ProposalStage.Executed: {
      return `Executed ${getHumanReadableTimeString(stageStartTimestamp)}`;
    }
  }
}
