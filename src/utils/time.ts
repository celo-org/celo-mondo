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
  timestampExecuted,
  expiryTimestamp,
}: {
  timestampExecuted: number | undefined;
  expiryTimestamp: number | undefined;
}): string | undefined {
  const now = Date.now();
  if (timestampExecuted) {
    return `Executed ${getHumanReadableTimeString(timestampExecuted)}`;
  } else if (expiryTimestamp && expiryTimestamp > 0 && expiryTimestamp > now) {
    return `Expires in ${getHumanReadableDuration(expiryTimestamp - now)} on ${getFullDateHumanDateString(expiryTimestamp)}`;
  } else if (expiryTimestamp && expiryTimestamp > 0 && expiryTimestamp < now) {
    return `Expired ${getHumanReadableTimeString(expiryTimestamp - now)}`;
  } else {
    return undefined;
  }
}
