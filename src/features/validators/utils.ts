import { toTitleCase } from 'src/utils/strings';

export function cleanGroupName(name: string) {
  return toTitleCase(
    name
      .replace(/group|Group/g, '')
      .replace(/[-_]/g, ' ')
      .trim(),
  );
}
