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

type RewardFactor = {
  factor: number;
  label: string;
  // Wording for the hover text when this factor takes nothing off the projection.
  idleLabel?: string;
};

// On-chain, a group's voter rewards are scaled by its score and slashing multiplier,
// the group keeps its voter reward commission, and only groups that are elected and
// meet the locked CELO requirement receive rewards at all. Returns each factor in
// the order the protocol applies them, or undefined when a reward input is unknown.
function getRewardFactors(group: RewardInputs): RewardFactor[] | undefined {
  if (
    group.slashingMultiplier === null ||
    group.meetsLockedGoldRequirement === null ||
    group.commission === null
  ) {
    return undefined;
  }
  if (!isElected(group)) return [{ factor: 0, label: 'Not elected' }];
  if (!group.meetsLockedGoldRequirement) {
    return [{ factor: 0, label: 'Below locked CELO requirement' }];
  }
  return [
    { factor: group.score, label: `Score ${(group.score * 100).toFixed()}%` },
    {
      factor: group.slashingMultiplier,
      label: `Slashing penalty ${((1 - group.slashingMultiplier) * 100).toFixed()}%`,
      idleLabel: 'Not slashed',
    },
    {
      factor: 1 - group.commission,
      label: `Commission ${formatCommission(group.commission)}`,
      idleLabel: 'No commission',
    },
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
  return compoundDaily(factors.reduce((rate, { factor }) => rate * factor, networkRate));
}

// Lines explaining the projection: the network-wide maximum, then one per on-chain
// factor saying how much it takes off, or just its state when it takes nothing.
export function getProjectedGroupApyLines(
  networkRate: number | undefined,
  group: RewardInputs,
): string[] | undefined {
  const factors = getRewardFactors(group);
  if (networkRate === undefined || !factors) return undefined;
  const maxApy = compoundDaily(networkRate);
  const lines = [`Max APY ${maxApy.toFixed(2)}%`];
  let rate = networkRate;
  let apy = maxApy;
  for (const { factor, label, idleLabel } of factors) {
    rate *= factor;
    const next = compoundDaily(rate);
    const cut = (apy - next).toFixed(2);
    if (factor === 0) lines.push(`${label}: no rewards`);
    else if (cut === '0.00') lines.push(idleLabel ?? label);
    else lines.push(`${label}: -${cut}%`);
    apy = next;
  }
  return lines;
}

// Hover text for the APY cell: the explanation lines followed by the result.
export function describeProjectedGroupApy(
  networkRate: number | undefined,
  group: RewardInputs,
): string | undefined {
  const apy = getProjectedGroupApy(networkRate, group);
  const lines = getProjectedGroupApyLines(networkRate, group);
  if (apy === undefined || !lines) return undefined;
  return [...lines, `Projected APY ${apy.toFixed(2)}%`].join('\n');
}
