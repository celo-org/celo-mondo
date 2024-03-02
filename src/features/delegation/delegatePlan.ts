import { lockedGoldABI } from '@celo/abis';
import { Addresses } from 'src/config/contracts';
import {
  DelegateActionType,
  DelegateFormValues,
  DelegationBalances,
} from 'src/features/delegation/types';
import { TxPlan } from 'src/features/transactions/types';
import { logger } from 'src/utils/logger';
import { toFixidity } from 'src/utils/numbers';

export function getDelegateTxPlan(
  values: DelegateFormValues,
  _delegations?: DelegationBalances,
): TxPlan {
  const { action, delegatee, percent } = values;

  if (action === DelegateActionType.Delegate) {
    return getDelegateActionPlan(delegatee, percent);
  } else if (action === DelegateActionType.Undelegate) {
    return getUndelegateActionPlan(delegatee, percent);
  } else if (action === DelegateActionType.Transfer) {
    return [
      ...getUndelegateActionPlan(delegatee, percent),
      ...getDelegateActionPlan(delegatee, percent),
    ];
  } else {
    logger.error(`Invalid delegate action type: ${action}`);
    return [];
  }
}

function getDelegateActionPlan(delegatee: Address, percent: number): TxPlan {
  return [
    {
      action: DelegateActionType.Delegate,
      address: Addresses.LockedGold,
      abi: lockedGoldABI,
      functionName: 'delegateGovernanceVotes',
      args: [delegatee, toFixidity(percent / 100)],
    },
  ];
}

function getUndelegateActionPlan(delegatee: Address, percent: number) {
  return [
    {
      action: DelegateActionType.Delegate,
      address: Addresses.LockedGold,
      abi: lockedGoldABI,
      functionName: 'revokeDelegatedGovernanceVotes',
      args: [delegatee, toFixidity(percent / 100)],
    },
  ];
}
