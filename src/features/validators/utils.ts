import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { eqAddressSafe } from 'src/utils/addresses';
import { toTitleCase, trimToLength } from 'src/utils/strings';

export function findGroup(groups?: ValidatorGroup[], address?: Address) {
  if (!groups || !address) return undefined;
  return groups.find((g) => eqAddressSafe(g.address, address));
}

export function cleanGroupName(name: string) {
  return trimToLength(toTitleCase(name.replace(/group|Group/g, '').replace(/[-_]/g, ' ')), 20);
}

export function isElected(group: ValidatorGroup) {
  return Object.values(group.members).some((m) => m.status === ValidatorStatus.Elected);
}

export function getGroupStats(group?: ValidatorGroup) {
  if (!group) return { numMembers: 0, numElected: 0, score: 0 };
  const members = Object.values(group.members);
  const electedMembers = members.filter((m) => m.status === ValidatorStatus.Elected);
  return { numMembers: members.length, numElected: electedMembers.length, score: group.score };
}
