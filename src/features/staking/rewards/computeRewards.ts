import { StakeEvent, StakeEventType, StakingBalances } from 'src/features/staking/types';
import { fromWei } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { objKeys } from 'src/utils/objects';
import { getDaysBetween } from 'src/utils/time';

export function computeStakingRewards(
  stakeEvents: StakeEvent[],
  stakes: StakingBalances,
  mode: 'amount' | 'apy' = 'amount',
): Record<Address, number> {
  return mode === 'amount'
    ? computeRewardAmount(stakeEvents, stakes)
    : computeRewardApy(stakeEvents, stakes);
}

function computeRewardAmount(stakeEvents: StakeEvent[], stakes: StakingBalances) {
  const groupTotals: Record<Address, bigint> = {}; // group addr to sum votes
  for (const event of stakeEvents) {
    const { group, type, value } = event;
    if (!groupTotals[group]) groupTotals[group] = 0n;
    if (type === StakeEventType.Activate) {
      groupTotals[group] -= value;
    } else if (type === StakeEventType.Revoke) {
      groupTotals[group] += value;
    }
  }

  const groupRewards: Record<Address, number> = {}; // group addr to rewards in wei
  for (const group of objKeys(groupTotals)) {
    const currentVotes = stakes[group]?.active || 0n;
    const totalVoted = groupTotals[group];
    const rewardWei = currentVotes + totalVoted;
    if (rewardWei > 0n) {
      groupRewards[group] = fromWei(rewardWei);
    } else {
      logger.warn('Reward for group < 0, should never happen', rewardWei.toString(), group);
      groupRewards[group] = 0;
    }
  }
  return groupRewards;
}

function computeRewardApy(stakeEvents: StakeEvent[], stakes: StakingBalances) {
  // First get total reward amounts per group
  const groupRewardAmounts = computeRewardAmount(stakeEvents, stakes);

  // Next, gather events by group
  const groupEvents: Record<Address, StakeEvent[]> = {}; // group addr to events
  for (const event of stakeEvents) {
    const group = event.group;
    if (!groupEvents[group]) groupEvents[group] = [];
    groupEvents[group].push(event);
  }

  // Finally, use avg active amounts to compute APR and APY
  const groupApy: Record<Address, number> = {}; // weighted avgs of active votes
  for (const group of objKeys(groupEvents)) {
    const { avgActive, totalDays } = getTimeWeightedAverageActive(groupEvents[group]);
    const rewardAmount = groupRewardAmounts[group];
    const apr = (rewardAmount / avgActive / totalDays) * 365;
    const apy = (1 + apr / 365) ** 365 - 1;
    groupApy[group] = Math.round(apy * 10000) / 100;
  }

  return groupApy;
}

export function getTimeWeightedAverageActive(events: StakeEvent[]) {
  const numEvents = events.length;
  if (numEvents === 0) throw new Error('Expected at least 1 stake event');
  const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
  let activeVotes = 0;
  let sum = 0;
  let totalDays = 0;
  for (let i = 0; i < numEvents; i++) {
    const { type, value: valueInWei, timestamp } = sortedEvents[i];
    const value = fromWei(valueInWei);
    // has next event ? its timestamp : today
    const nextTimestamp = i < numEvents - 1 ? sortedEvents[i + 1].timestamp : Date.now();
    const numDays = getDaysBetween(timestamp, nextTimestamp);
    if (type === StakeEventType.Activate) {
      activeVotes += value;
    } else {
      activeVotes -= value;
    }
    // ignore periods where nothing was staked
    if (activeVotes < 0.01) continue;
    sum += activeVotes * numDays;
    totalDays += numDays;
  }

  return { avgActive: sum / totalDays, totalDays };
}
