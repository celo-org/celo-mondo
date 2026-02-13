import { describe, expect, it } from 'vitest';
import { ValidatorGroup } from './types';
import { getRemainingCapacity, isGroupAtCapacity } from './utils';

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
    expect(getRemainingCapacity(undefined)).toBe(0n);
  });

  it('returns remaining capacity when votes are less than capacity', () => {
    const group = createMockGroup(1000n, 300n);
    expect(getRemainingCapacity(group)).toBe(700n);
  });

  it('returns 0 when votes equal capacity', () => {
    const group = createMockGroup(1000n, 1000n);
    expect(getRemainingCapacity(group)).toBe(0n);
  });

  it('returns negative value when votes exceed capacity', () => {
    const group = createMockGroup(1000n, 1200n);
    expect(getRemainingCapacity(group)).toBe(-200n);
  });

  it('handles zero capacity', () => {
    const group = createMockGroup(0n, 0n);
    expect(getRemainingCapacity(group)).toBe(0n);
  });

  it('handles zero votes', () => {
    const group = createMockGroup(1000n, 0n);
    expect(getRemainingCapacity(group)).toBe(1000n);
  });
});

describe('isGroupAtCapacity', () => {
  it('returns true when group is undefined', () => {
    expect(isGroupAtCapacity(undefined)).toBe(true);
  });

  it('returns false when group has remaining capacity', () => {
    const group = createMockGroup(1000n, 300n);
    expect(isGroupAtCapacity(group)).toBe(false);
  });

  it('returns true when votes equal capacity', () => {
    const group = createMockGroup(1000n, 1000n);
    expect(isGroupAtCapacity(group)).toBe(true);
  });

  it('returns true when votes exceed capacity', () => {
    const group = createMockGroup(1000n, 1200n);
    expect(isGroupAtCapacity(group)).toBe(true);
  });

  it('returns true when capacity is zero', () => {
    const group = createMockGroup(0n, 0n);
    expect(isGroupAtCapacity(group)).toBe(true);
  });

  it('returns false when capacity is non-zero and no votes', () => {
    const group = createMockGroup(1000n, 0n);
    expect(isGroupAtCapacity(group)).toBe(false);
  });
});
