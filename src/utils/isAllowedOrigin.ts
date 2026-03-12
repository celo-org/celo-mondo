export function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const effectiveOrigin = origin || (referer ? new URL(referer).origin : null);
  if (!effectiveOrigin) {
    return false;
  }

  const allowed = new Set<string>();

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowed.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  if (process.env.VERCEL_URL) {
    allowed.add(`https://${process.env.VERCEL_URL}`);
  }

  allowed.add('https://mondo.celo.org');

  return allowed.has(effectiveOrigin);
}
