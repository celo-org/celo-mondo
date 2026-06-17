import { describe, expect, it } from 'vitest';
import { scrubAddressesFromUrl, scrubEventUrlProperties } from './posthog';

const ADDR = '0xAbCdEf1234567890abcdef1234567890AbCdEf12';
const ADDR2 = '0x1111111111111111111111111111111111111111';

describe('scrubAddressesFromUrl', () => {
  it('replaces a single address in a path', () => {
    expect(scrubAddressesFromUrl(`/validators/${ADDR}`)).toBe('/validators/[address]');
  });

  it('replaces multiple addresses', () => {
    expect(scrubAddressesFromUrl(`/from/${ADDR}/to/${ADDR2}`)).toBe('/from/[address]/to/[address]');
  });

  it('is case-insensitive', () => {
    expect(scrubAddressesFromUrl(`/delegate/${ADDR.toLowerCase()}`)).toBe('/delegate/[address]');
  });

  it('leaves strings without addresses unchanged', () => {
    expect(scrubAddressesFromUrl('/governance/proposals')).toBe('/governance/proposals');
  });

  it('does not match a hex string shorter than 40 chars', () => {
    const short = '0x1234abcd';
    expect(scrubAddressesFromUrl(`/foo/${short}`)).toBe(`/foo/${short}`);
  });

  it('handles a full URL', () => {
    expect(scrubAddressesFromUrl(`https://example.com/validators/${ADDR}?ref=home`)).toBe(
      `https://example.com/validators/[address]?ref=home`,
    );
  });
});

describe('scrubEventUrlProperties', () => {
  it('scrubs $current_url', () => {
    const props: Record<string, unknown> = { $current_url: `/validators/${ADDR}` };
    scrubEventUrlProperties(props);
    expect(props['$current_url']).toBe('/validators/[address]');
  });

  it('scrubs $pathname', () => {
    const props: Record<string, unknown> = { $pathname: `/delegate/${ADDR}` };
    scrubEventUrlProperties(props);
    expect(props['$pathname']).toBe('/delegate/[address]');
  });

  it('scrubs $referrer and $initial_referrer', () => {
    const props: Record<string, unknown> = {
      $referrer: `https://example.com/validators/${ADDR}`,
      $initial_referrer: `https://example.com/delegate/${ADDR2}`,
    };
    scrubEventUrlProperties(props);
    expect(props['$referrer']).toBe('https://example.com/validators/[address]');
    expect(props['$initial_referrer']).toBe('https://example.com/delegate/[address]');
  });

  it('ignores non-string property values', () => {
    const props: Record<string, unknown> = { $current_url: 42 };
    scrubEventUrlProperties(props);
    expect(props['$current_url']).toBe(42);
  });

  it('leaves unrelated properties untouched', () => {
    const props: Record<string, unknown> = {
      $current_url: '/governance',
      walletType: 'MetaMask',
    };
    scrubEventUrlProperties(props);
    expect(props['$current_url']).toBe('/governance');
    expect(props['walletType']).toBe('MetaMask');
  });
});
