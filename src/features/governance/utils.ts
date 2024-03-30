import { VoteAmounts, VoteType } from 'src/features/governance/types';

export function getLargestVoteType(votes: VoteAmounts) {
  let maxType = VoteType.None;
  let maxValue = 0n;

  for (const [type, value] of Object.entries(votes)) {
    if (value && value > maxValue) {
      maxType = type as VoteType;
      maxValue = value;
    }
  }

  return { type: maxType, value: maxValue };
}
