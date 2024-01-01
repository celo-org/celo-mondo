import {
  LockActionType,
  LockTokenParams,
  LockTokenTxPlan,
  PendingWithdrawal,
} from 'src/features/locking/types';
import { bigIntMin } from 'src/utils/math';

// Lock token operations can require varying numbers of txs in specific order
// This determines the ideal tx types and order
export function getLockActionTxPlan(
  params: LockTokenParams,
  pendingWithdrawals: PendingWithdrawal[],
): LockTokenTxPlan {
  const { type, amountWei } = params;

  if (type === LockActionType.Unlock) {
    // If only all three cases were this simple :)
    return [{ type, amountWei }];
  } else if (type === LockActionType.Lock) {
    const txs: LockTokenTxPlan = [];
    // Need relock from the pendings in reverse order
    // due to the way the storage is managed in the contract
    let amountRemaining = amountWei;
    const pwSorted = [...pendingWithdrawals].sort((a, b) => b.index - a.index);
    for (const p of pwSorted) {
      if (amountRemaining <= 0) break;
      const txAmount = bigIntMin(amountRemaining, p.value);
      txs.push({
        type: LockActionType.Relock,
        amountWei: txAmount,
        pendingWithdrawal: p,
      });
      amountRemaining -= txAmount;
    }
    // If pending relocks didn't cover it
    if (amountRemaining > 0) {
      txs.push({ type: LockActionType.Lock, amountWei: amountRemaining });
    }
    return txs;
  } else if (type === LockActionType.Withdraw) {
    const txs: LockTokenTxPlan = [];
    const now = Date.now();
    // Withdraw all available pendings
    for (const p of pendingWithdrawals) {
      if (p.timestamp <= now)
        txs.push({
          type: LockActionType.Withdraw,
          amountWei: p.value,
          pendingWithdrawal: p,
        });
    }
    return txs;
  } else {
    throw new Error(`Invalid lock token action type: ${type}`);
  }
}

// async function createLockCeloTx(
//   txPlanItem: LockTokenTxPlanItem,
//   feeEstimate: FeeEstimate,
//   nonce: number,
// ) {
//   const lockedGold = getContract(CeloContract.LockedGold);
//   const tx = await lockedGold.populateTransaction.lock();
//   tx.value = BigNumber.from(txPlanItem.amountWei);
//   tx.nonce = nonce;
//   logger.info('Signing lock celo tx');
//   return signTransaction(tx, feeEstimate);
// }

// async function createRelockCeloTx(
//   txPlanItem: LockTokenTxPlanItem,
//   feeEstimate: FeeEstimate,
//   nonce: number,
// ) {
//   const { amountWei, pendingWithdrawal } = txPlanItem;
//   if (!pendingWithdrawal) throw new Error('Pending withdrawal missing from relock tx');
//   const lockedGold = getContract(CeloContract.LockedGold);
//   const tx = await lockedGold.populateTransaction.relock(pendingWithdrawal.index, amountWei);
//   tx.nonce = nonce;
//   logger.info('Signing relock celo tx');
//   return signTransaction(tx, feeEstimate);
// }

// async function createUnlockCeloTx(
//   txPlanItem: LockTokenTxPlanItem,
//   feeEstimate: FeeEstimate,
//   nonce: number,
// ) {
//   const { amountWei } = txPlanItem;
//   const lockedGold = getContract(CeloContract.LockedGold);
//   const tx = await lockedGold.populateTransaction.unlock(amountWei);
//   tx.nonce = nonce;
//   logger.info('Signing unlock celo tx');
//   return signTransaction(tx, feeEstimate);
// }

// async function createWithdrawCeloTx(
//   txPlanItem: LockTokenTxPlanItem,
//   feeEstimate: FeeEstimate,
//   nonce: number,
// ) {
//   const { pendingWithdrawal } = txPlanItem;
//   if (!pendingWithdrawal) throw new Error('Pending withdrawal missing from withdraw tx');
//   const lockedGold = getContract(CeloContract.LockedGold);
//   const tx = await lockedGold.populateTransaction.withdraw(pendingWithdrawal.index);
//   tx.nonce = nonce;
//   logger.info('Signing withdraw celo tx');
//   return signTransaction(tx, feeEstimate);
// }
