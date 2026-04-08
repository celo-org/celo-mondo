import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAllowedOrigin } from './isAllowedOrigin';

describe('isAllowedOrigin', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows any origin in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isAllowedOrigin('https://evil.com', null)).toBe(true);
  });

  it('rejects null origin and referer in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin(null, null)).toBe(false);
  });

  it('allows the hardcoded production origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin('https://mondo.celo.org', null)).toBe(true);
  });

  it('rejects an unknown origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin('https://evil.com', null)).toBe(false);
  });

  it('allows VERCEL_PROJECT_PRODUCTION_URL origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'custom.celo.org');
    expect(isAllowedOrigin('https://custom.celo.org', null)).toBe(true);
  });

  it('allows VERCEL_URL origin (preview deploy)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_URL', 'celo-mondo-abc123-c-labs.vercel.app');
    expect(isAllowedOrigin('https://celo-mondo-abc123-c-labs.vercel.app', null)).toBe(true);
  });

  it('falls back to referer when origin is null', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin(null, 'https://mondo.celo.org/governance?tab=proposals')).toBe(true);
  });

  it('rejects when referer is from a different domain', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin(null, 'https://evil.com/fake-page')).toBe(false);
  });

  it('rejects malformed referer without throwing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin(null, 'not-a-url')).toBe(false);
  });
});
