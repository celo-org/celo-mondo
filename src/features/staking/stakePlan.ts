import { electionABI } from '@celo/abis';
import { MIN_INCREMENTAL_VOTE_AMOUNT, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { GroupToStake, StakeActionType, StakeFormValues } from 'src/features/staking/types';
import { TxPlan } from 'src/features/transactions/types';
import { ValidatorGroup } from 'src/features/validators/types';
import { eqAddress } from 'src/utils/addresses';
import { toWeiSafe } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { bigIntMin } from 'src/utils/math';

export function getStakeTxPlan(
  values: StakeFormValues,
  groups: ValidatorGroup[],
  groupToStake: GroupToStake,
): TxPlan {
  const { action, amount, group, transferGroup } = values;
  // TODO toWeiAdjusted here
  const amountWei = toWeiSafe(amount);

  if (action === StakeActionType.Stake) {
    return getStakeActionPlan(amountWei, group, groups);
  } else if (action === StakeActionType.Unstake) {
    return getUnstakeActionPlan(amountWei, group, groups, groupToStake);
  } else if (action === StakeActionType.Transfer) {
    return [
      ...getUnstakeActionPlan(amountWei, group, groups, groupToStake),
      ...getStakeActionPlan(amountWei, transferGroup, groups),
    ];
  } else {
    logger.error(`Invalid lock token action type: ${action}`);
    return [];
  }
}

function getStakeActionPlan(amountWei: bigint, group: Address, groups: ValidatorGroup[]): TxPlan {
  const { lesser, greater } = findLesserAndGreaterAfterVote(groups, group, amountWei);
  return [
    {
      action: StakeActionType.Stake,
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'vote',
      args: [group, amountWei, lesser, greater],
    },
  ];
}

function getUnstakeActionPlan(
  amountWei: bigint,
  group: Address,
  groups: ValidatorGroup[],
  groupToStake: GroupToStake,
) {
  if (!groups.length || !groupToStake[group]) return [];

  const txs: TxPlan = [];
  const { groupIndex, pending: amountPending } = groupToStake[group];
  let amountRemaining = amountWei;

  // Start by revoking from pending amounts
  const pendingToRevoke = bigIntMin(amountPending, amountRemaining);
  if (pendingToRevoke > 0n) {
    const { lesser, greater } = findLesserAndGreaterAfterVote(groups, group, pendingToRevoke * -1n);
    txs.push({
      action: StakeActionType.Unstake,
      address: Addresses.Election,
      abi: electionABI,
      functionName: 'revokePending',
      args: [group, pendingToRevoke, lesser, greater, groupIndex],
    });
    amountRemaining -= pendingToRevoke;
  }

  // Stop here if remaining after pending is very small
  if (amountRemaining < MIN_INCREMENTAL_VOTE_AMOUNT) return txs;

  // Revoke remaining from active amounts
  const { lesser, greater } = findLesserAndGreaterAfterVote(groups, group, amountRemaining * -1n);
  txs.push({
    action: StakeActionType.Unstake,
    address: Addresses.Election,
    abi: electionABI,
    functionName: 'revokeActive',
    args: [group, amountRemaining, lesser, greater, groupIndex],
  });
  return txs;
}

function findLesserAndGreaterAfterVote(
  groups: ValidatorGroup[],
  targetGroup: Address,
  voteWeight: bigint,
): { lesser: string; greater: string } {
  const sortedGroups = groups.sort((a, b) => (b.votes > a.votes ? 1 : -1));
  const selectedGroup = sortedGroups.find((g) => eqAddress(targetGroup, g.address));
  const voteTotal = (selectedGroup?.votes || 0n) + voteWeight;
  let greater = ZERO_ADDRESS;
  let lesser = ZERO_ADDRESS;

  // This requires sortedGroups be descending (greatest to lowest)
  for (const g of sortedGroups) {
    if (eqAddress(g.address, targetGroup)) continue;
    if (g.votes < voteTotal) {
      lesser = g.address;
      break;
    }
    greater = g.address;
  }

  return { lesser, greater };
}
