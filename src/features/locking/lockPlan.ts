import { LockActionType, LockFormValues, PendingWithdrawal } from 'src/features/locking/types';
import { StakingBalances } from 'src/features/staking/types';
import { TxPlan } from 'src/features/transactions/types';
import { toWeiSafe } from 'src/utils/amount';
import { bigIntMin } from 'src/utils/math';

// Lock token operations can require varying numbers of txs in specific order
// This determines the ideal tx types and order
export function getLockTxPlan(
  values: LockFormValues,
  pendingWithdrawals: PendingWithdrawal[],
  _stakeBalances: StakingBalances,
  // TODO add governance, delegation state here
): TxPlan {
  const { action, amount } = values;
  // TODO toWeiAdjusted here
  const amountWei = toWeiSafe(amount);

  // TODO update this to account for staking, governance, and delegation revocations first
  if (action === LockActionType.Unlock) {
    return [{ action, functionName: 'unlock', args: [amountWei] }];
  } else if (action === LockActionType.Lock) {
    const txs: TxPlan = [];
    // Need relock from the pendings in reverse order
    // due to the way the storage is managed in the contract
    let amountRemaining = amountWei;
    const pwSorted = [...pendingWithdrawals].sort((a, b) => b.index - a.index);
    for (const p of pwSorted) {
      if (amountRemaining <= 0) break;
      const txAmount = bigIntMin(amountRemaining, p.value);
      txs.push({
        action,
        functionName: 'relock',
        args: [p.index, txAmount],
      });
      amountRemaining -= txAmount;
    }
    // If pending relocks didn't cover it
    if (amountRemaining > 0) {
      txs.push({ action, functionName: 'lock', value: amountRemaining });
    }
    return txs;
  } else if (action === LockActionType.Withdraw) {
    const txs: TxPlan = [];
    const now = Date.now();
    // Withdraw all available pendings
    for (const p of pendingWithdrawals) {
      if (p.timestamp <= now)
        txs.push({
          action,
          functionName: 'withdraw',
          args: [p.index],
        });
    }
    return txs;
  } else {
    throw new Error(`Invalid lock token action type: ${action}`);
  }
}
