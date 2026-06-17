import { describe, expect, it } from 'vitest';
import { ValidatorGroup } from './types';
import { getRemainingCapacityWei } from './utils';

const createMockGroup = (capacity: bigint, votes: bigint): ValidatorGroup => ({
  address: '0x123' as Address,
  name: 'Test Group',
  url: 'https://example.com',
  eligible: true,
  capacity,
  votes,
  lastSlashed: null,
  members: {},
  score: 0.5,
});

describe('getRemainingCapacity', () => {
  it('returns 0 when group is undefined', () => {
    expect(getRemainingCapacityWei(undefined)).toBe(0n);
  });

  it('returns remaining capacity when votes are less than capacity', () => {
    const group = createMockGroup(1000n, 300n);
    expect(getRemainingCapacityWei(group)).toBe(700n);
  });

  it('returns 0 when votes equal capacity', () => {
    const group = createMockGroup(1000n, 1000n);
    expect(getRemainingCapacityWei(group)).toBe(0n);
  });

  it('returns negative value when votes exceed capacity', () => {
    const group = createMockGroup(1000n, 1200n);
    expect(getRemainingCapacityWei(group)).toBe(0n);
  });

  it('handles zero capacity', () => {
    const group = createMockGroup(0n, 0n);
    expect(getRemainingCapacityWei(group)).toBe(0n);
  });

  it('handles zero votes', () => {
    const group = createMockGroup(1000n, 0n);
    expect(getRemainingCapacityWei(group)).toBe(1000n);
  });
});
