import { LockedBalances } from 'src/features/locking/types';
import { GroupToStake } from 'src/features/staking/types';

export function getTotalNonvotingLocked(
  { locked: totalLocked }: LockedBalances,
  stakes: GroupToStake,
) {
  const totalVoted = Object.values(stakes).reduce((sum, v) => sum + v.active + v.pending, 0n);
  return totalLocked - totalVoted;
}
