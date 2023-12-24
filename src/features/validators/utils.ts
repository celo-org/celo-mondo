import { ValidatorGroup, ValidatorStatus } from 'src/features/validators/types';
import { toTitleCase } from 'src/utils/strings';

export function cleanGroupName(name: string) {
  return toTitleCase(
    name
      .replace(/group|Group/g, '')
      .replace(/[-_]/g, ' ')
      .trim(),
  );
}

export function isElected(group: ValidatorGroup) {
  return Object.values(group.members).some((m) => m.status === ValidatorStatus.Elected);
}
