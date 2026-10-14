import { describe, expect, it } from 'vitest';
import { ValidatorGroup, ValidatorStatus } from './types';
import {
  compoundDaily,
  describeProjectedGroupApy,
  formatCommission,
  getProjectedGroupApy,
  getProjectedGroupApyLines,
  getRemainingCapacityWei,
} from './utils';

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
  commission: 0,
  slashingMultiplier: 1,
  meetsLockedGoldRequirement: true,
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

describe('formatCommission', () => {
  it('shows an unknown commission as unavailable', () => {
    expect(formatCommission(null)).toBe('-');
  });

  it('formats zero commission', () => {
    expect(formatCommission(0)).toBe('0%');
  });

  it('formats a whole-number percentage without decimals', () => {
    expect(formatCommission(0.05)).toBe('5%');
    expect(formatCommission(0.1)).toBe('10%');
  });

  it('formats fractional percentages, trimming trailing zeros', () => {
    expect(formatCommission(0.025)).toBe('2.5%');
    expect(formatCommission(0.1234)).toBe('12.34%');
  });

  it('rounds to at most two decimals', () => {
    expect(formatCommission(0.123456)).toBe('12.35%');
  });

  it('defaults to 0% when commission is undefined', () => {
    expect(formatCommission(undefined)).toBe('0%');
  });
});

describe('getProjectedGroupApy', () => {
  const electedMember = {
    address: '0xabc' as Address,
    name: 'validator',
    score: 1,
    signer: '0xabc' as Address,
    status: ValidatorStatus.Elected,
  };

  it('compounds the network rate scaled by score, slashing multiplier and voter reward commission', () => {
    const group = {
      ...createMockGroup(1000n, 100n),
      members: { '0xabc': electedMember },
      score: 0.5,
      slashingMultiplier: 0.8,
      commission: 0.1,
    };
    expect(getProjectedGroupApy(4, group)).toBeCloseTo(1.4504, 3);
  });

  it('returns 0 for a group with no elected validator', () => {
    expect(getProjectedGroupApy(4, createMockGroup(1000n, 100n))).toBe(0);
  });

  it('returns 0 for an elected group below the locked CELO requirement', () => {
    const group = {
      ...createMockGroup(1000n, 100n),
      members: { '0xabc': electedMember },
      meetsLockedGoldRequirement: false,
    };
    expect(getProjectedGroupApy(4, group)).toBe(0);
  });

  it('returns undefined when an on-chain reward input is unknown', () => {
    const elected = { ...createMockGroup(1000n, 100n), members: { '0xabc': electedMember } };
    expect(getProjectedGroupApy(4, { ...elected, slashingMultiplier: null })).toBeUndefined();
    expect(
      getProjectedGroupApy(4, { ...elected, meetsLockedGoldRequirement: null }),
    ).toBeUndefined();
    expect(getProjectedGroupApy(4, { ...elected, commission: null })).toBeUndefined();
  });

  it('returns undefined when the network rate is unknown', () => {
    expect(getProjectedGroupApy(undefined, createMockGroup(1000n, 100n))).toBeUndefined();
  });
});

describe('describeProjectedGroupApy', () => {
  const electedMember = {
    address: '0xabc' as Address,
    name: 'validator',
    score: 1,
    signer: '0xabc' as Address,
    status: ValidatorStatus.Elected,
  };

  it('lists the network maximum and what each factor takes off it', () => {
    const group = {
      ...createMockGroup(1000n, 100n),
      members: { '0xabc': electedMember },
      score: 0.5,
      slashingMultiplier: 0.8,
      commission: 0.1,
    };
    expect(describeProjectedGroupApy(4, group)).toBe(
      [
        'Max APY 4.08%',
        'Score 50%: -2.06%',
        'Slashing penalty 20%: -0.41%',
        'Commission 10%: -0.16%',
        'Projected APY 1.45%',
      ].join('\n'),
    );
  });

  it('names a factor without an amount when it takes nothing off', () => {
    const group = {
      ...createMockGroup(1000n, 100n),
      members: { '0xabc': electedMember },
      score: 1,
    };
    expect(describeProjectedGroupApy(4, group)).toBe(
      ['Max APY 4.08%', 'Score 100%', 'Not slashed', 'No commission', 'Projected APY 4.08%'].join(
        '\n',
      ),
    );
  });

  it('explains a zero projection by the reason the group earns nothing', () => {
    expect(describeProjectedGroupApy(4, createMockGroup(1000n, 100n))).toBe(
      ['Max APY 4.08%', 'Not elected: no rewards', 'Projected APY 0.00%'].join('\n'),
    );
    const belowRequirement = {
      ...createMockGroup(1000n, 100n),
      members: { '0xabc': electedMember },
      meetsLockedGoldRequirement: false,
    };
    expect(describeProjectedGroupApy(4, belowRequirement)).toContain(
      'Below locked CELO requirement: no rewards',
    );
  });

  it('exposes the explanation lines without the result for inline display', () => {
    const group = {
      ...createMockGroup(1000n, 100n),
      members: { '0xabc': electedMember },
      score: 1,
    };
    expect(getProjectedGroupApyLines(4, group)).toEqual([
      'Max APY 4.08%',
      'Score 100%',
      'Not slashed',
      'No commission',
    ]);
  });

  it('is undefined whenever the projection is', () => {
    const group = createMockGroup(1000n, 100n);
    expect(describeProjectedGroupApy(undefined, group)).toBeUndefined();
    expect(describeProjectedGroupApy(4, { ...group, commission: null })).toBeUndefined();
  });
});

describe('compoundDaily', () => {
  it('compounds a simple annual rate daily', () => {
    expect(compoundDaily(0)).toBe(0);
    expect(compoundDaily(10)).toBeCloseTo(10.5156, 3);
  });
});
