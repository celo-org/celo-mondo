import {
  computeStakingRewards,
  getTimeWeightedAverageActive,
} from 'src/features/staking/rewards/computeRewards';
import { GroupToStake, StakeEvent, StakeEventType } from 'src/features/staking/types';
import { nowMinusDays } from 'src/test/time';
import { toWei } from 'src/utils/amount';

function stakes(activeAmount: number, group = '0x1'): GroupToStake {
  return {
    [group]: { active: toWei(activeAmount), pending: 0n, groupIndex: 0 },
  };
}

const activate1: StakeEvent = {
  type: StakeEventType.Activate,
  group: '0x1',
  value: toWei(1),
  units: 0n,
  blockNumber: 0,
  timestamp: nowMinusDays(30),
  txHash: '0x2',
};
const revoke1: StakeEvent = {
  ...activate1,
  type: StakeEventType.Revoke,
  value: toWei(0.5),
  timestamp: nowMinusDays(20),
};
const activate2: StakeEvent = {
  ...activate1,
  value: toWei(2),
  timestamp: nowMinusDays(10),
};
const revoke2: StakeEvent = {
  ...revoke1,
  value: toWei(2.55),
  timestamp: nowMinusDays(5),
};

const activate3: StakeEvent = {
  ...activate1,
  group: '0x2',
  value: toWei(1000),
};

describe('Computes reward amounts correctly', () => {
  it('For a simple activation', () => {
    const rewards = computeStakingRewards([activate1], stakes(1.1));
    expect(rewards).toEqual({ '0x1': 0.1 });
  });
  it('For a simple activation and revoke', () => {
    const rewards = computeStakingRewards([activate1, revoke1], stakes(0.6));
    expect(rewards).toEqual({ '0x1': 0.1 });
  });
  it('For a complex activation and revoke', () => {
    const rewards = computeStakingRewards([activate1, revoke1, activate2, revoke2], stakes(0));
    expect(rewards).toEqual({ '0x1': 0.05 });
  });
  it('For a multiple groups', () => {
    const votes = { ...stakes(0.55), ...stakes(1005, '0x2') };
    const rewards = computeStakingRewards([activate1, revoke1, activate3], votes);
    expect(rewards).toEqual({ '0x1': 0.05, '0x2': 5 });
  });
});

describe('Computes time-weighted avgs correctly', () => {
  it('For a single event', () => {
    const { avgActive, totalDays } = getTimeWeightedAverageActive([activate1]);
    expect(avgActive).toEqual(1);
    expect(totalDays).toEqual(30);
  });
  it('For a multiple events', () => {
    const { avgActive, totalDays } = getTimeWeightedAverageActive([activate1, revoke1, activate2]);
    expect(avgActive.toFixed(2)).toEqual('1.33');
    expect(totalDays).toEqual(30);
  });
  it('For a events with gap', () => {
    const { avgActive, totalDays } = getTimeWeightedAverageActive([
      activate1,
      revoke1,
      activate2,
      revoke2,
    ]);
    expect(avgActive.toFixed(2)).toEqual('1.10');
    expect(totalDays).toEqual(25);
  });
});

describe('Computes reward APYs correctly', () => {
  it('For a simple activation', () => {
    const rewards = computeStakingRewards([activate1], stakes(1.01), 'apy');
    expect(rewards).toEqual({ '0x1': 12.94 });
  });
  it('For a simple activation and revoke', () => {
    const rewards = computeStakingRewards([activate1, revoke1], stakes(0.51), 'apy');
    expect(rewards).toEqual({ '0x1': 20.02 });
  });
  it('For a complex activation and revoke', () => {
    const rewards = computeStakingRewards(
      [activate1, revoke1, activate2, revoke2],
      stakes(0),
      'apy',
    );
    expect(rewards).toEqual({ '0x1': 94.07 });
  });
  it('For a multiple groups', () => {
    const votes = { ...stakes(0.51), ...stakes(1005, '0x2') };
    const rewards = computeStakingRewards([activate1, revoke1, activate3], votes, 'apy');
    expect(rewards).toEqual({ '0x1': 20.02, '0x2': 6.27 });
  });
});
