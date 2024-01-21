import { StakeActionType, StakeFormValues } from 'src/features/staking/types';
import { TxPlan } from 'src/features/transactions/types';
import { toWeiSafe } from 'src/utils/amount';

export function getStakeTxPlan(values: StakeFormValues): TxPlan {
  const { action, amount } = values;
  // TODO toWeiAdjusted here
  const _amountWei = toWeiSafe(amount);

  if (action === StakeActionType.Stake) {
    return [{ action, functionName: 'TODO', args: [] }];
  } else if (action === StakeActionType.Unstake) {
    return [{ action, functionName: 'TODO', args: [] }];
  } else if (action === StakeActionType.Transfer) {
    return [{ action, functionName: 'TODO', args: [] }];
  } else {
    throw new Error(`Invalid lock token action type: ${action}`);
  }
}
