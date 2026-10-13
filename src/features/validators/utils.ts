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

// Projected yearly return for someone staking with this group, in percent.
// The network rate is the simple annual target voting yield. On-chain, a group's
// voter rewards are scaled by its score and slashing multiplier, the group keeps
// its voter reward commission, and only groups that are elected and meet the
// locked CELO requirement receive rewards at all. Undefined when the rate or
// the group's on-chain reward inputs are unknown.
export function getProjectedGroupApy(
  networkRate: number | undefined,
  group: Pick<
    ValidatorGroup,
    'score' | 'commission' | 'slashingMultiplier' | 'meetsLockedGoldRequirement' | 'members'
  >,
): number | undefined {
  if (networkRate === undefined) return undefined;
  if (
    group.slashingMultiplier === null ||
    group.meetsLockedGoldRequirement === null ||
    group.commission === null
  ) {
    return undefined;
  }
  if (!isElected(group) || !group.meetsLockedGoldRequirement) return 0;
  return compoundDaily(
    networkRate * group.score * group.slashingMultiplier * (1 - group.commission),
  );
}
