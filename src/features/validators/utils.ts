import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { eqAddressSafe } from 'src/utils/addresses';
import { toTitleCase, trimToLength } from 'src/utils/strings';

export function findGroup(groups?: ValidatorGroup[], address?: Address) {
  if (!groups || !address) return undefined;
  return groups.find((g) => eqAddressSafe(g.address, address));
}

export function cleanGroupName(name: string) {
  return trimToLength(name.replace(/group|Group/g, '').replace(/[-_]/g, ' '), 20);
}

export function cleanDelegateeName(name: string) {
  return trimToLength(toTitleCase(name.replace(/group|Group/g, '').replace(/[-_]/g, ' ')), 20);
}

export function isElected(group: Pick<ValidatorGroup, 'members'>) {
  return Object.values(group.members).some((m) => m.status === ValidatorStatus.Elected);
}

export function getGroupStats(group?: ValidatorGroup) {
  if (!group) return { numMembers: 0, numElected: 0, score: 0 };
  const members = Object.values(group.members);
  const electedMembers = members.filter((m) => m.status === ValidatorStatus.Elected);
  return { numMembers: members.length, numElected: electedMembers.length, score: group.score };
}

// Formats a voter reward commission (a 0–1 fraction) as a percentage string,
// trimming trailing zeros so 0.05 -> "5%" and 0.025 -> "2.5%". Null means the
// on-chain read failed and is shown as unavailable.
export function formatCommission(commission?: number | null): string {
  if (commission === null) return '-';
  const percent = (commission ?? 0) * 100;
  return `${percent.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

export function getRemainingCapacityWei(group?: ValidatorGroup): bigint {
  if (!group) return 0n;

  const remainingCapacity = group.capacity - group.votes;

  if (remainingCapacity < 0n) {
    return 0n;
  }

  return remainingCapacity;
}

// Epoch rewards are re-staked on-chain every epoch (one day), so the realized yearly
// return compounds daily. Converts a simple annual rate in percent into that APY.
export function compoundDaily(simpleAnnualRatePercent: number): number {
  return (Math.pow(1 + simpleAnnualRatePercent / 100 / 365, 365) - 1) * 100;
}

type RewardInputs = Pick<
  ValidatorGroup,
  'score' | 'commission' | 'slashingMultiplier' | 'meetsLockedGoldRequirement' | 'members'
>;

// On-chain, a group's voter rewards are scaled by its score and slashing multiplier,
// the group keeps its voter reward commission, and only groups that are elected and
// meet the locked CELO requirement receive rewards at all. Returns each factor with
// its label in the order the protocol applies them, or undefined when a reward
// input is unknown.
function getRewardFactors(group: RewardInputs): [label: string, factor: number][] | undefined {
  if (
    group.slashingMultiplier === null ||
    group.meetsLockedGoldRequirement === null ||
    group.commission === null
  ) {
    return undefined;
  }
  if (!isElected(group)) return [['Not elected', 0]];
  if (!group.meetsLockedGoldRequirement) return [['Below locked CELO requirement', 0]];
  return [
    [`Score ${(group.score * 100).toFixed()}%`, group.score],
    [
      `Slashing penalty ${((1 - group.slashingMultiplier) * 100).toFixed()}%`,
      group.slashingMultiplier,
    ],
    [`Commission ${formatCommission(group.commission)}`, 1 - group.commission],
  ];
}

// Projected yearly return for someone staking with this group, in percent.
// The network rate is the simple annual target voting yield. Undefined when the
// rate or the group's on-chain reward inputs are unknown.
export function getProjectedGroupApy(
  networkRate: number | undefined,
  group: RewardInputs,
): number | undefined {
  const factors = getRewardFactors(group);
  if (networkRate === undefined || !factors) return undefined;
  return compoundDaily(factors.reduce((rate, [, factor]) => rate * factor, networkRate));
}

// Hover text for the APY cell: the network-wide maximum, then how much each
// on-chain factor takes off it, one line per factor.
export function describeProjectedGroupApy(
  networkRate: number | undefined,
  group: RewardInputs,
): string | undefined {
  const factors = getRewardFactors(group);
  if (networkRate === undefined || !factors) return undefined;
  const maxApy = compoundDaily(networkRate);
  const lines = [`Max APY ${maxApy.toFixed(2)}%`];
  let rate = networkRate;
  let apy = maxApy;
  for (const [label, factor] of factors) {
    rate *= factor;
    const next = compoundDaily(rate);
    lines.push(`${label}: -${(apy - next).toFixed(2)}%`);
    apy = next;
  }
  lines.push(`Projected APY ${apy.toFixed(2)}%`);
  return lines.join('\n');
}
