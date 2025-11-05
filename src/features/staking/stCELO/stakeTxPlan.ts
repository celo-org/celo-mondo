import { config } from 'src/config/config';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { LiquidStakeActionType, LiquidStakeFormValues } from 'src/features/locking/types';
import { TxPlan } from 'src/features/transactions/types';
import { toWeiSafe } from 'src/utils/amount';
import { logger } from 'src/utils/logger';
import { SimulateContractParameters } from 'viem';

// Lock token operations can require varying numbers of txs in specific order
// This determines the ideal tx types and order
export function getStakeTxPlan(values: LiquidStakeFormValues): TxPlan {
  const { action, amount } = values;
  const amountWei = toWeiSafe(amount);

  if (action === LiquidStakeActionType.Stake) {
    const call = {
      ...ManagerABI,
      functionName: 'deposit',
      value: amountWei,
      args: [],
    } as SimulateContractParameters<typeof ManagerABI.abi, 'deposit'>;
    return [
      {
        action,
        chainId: config.chain.id,
        ...call,
      },
    ];
  }

  if (action === LiquidStakeActionType.Unstake) {
    const call = {
      ...ManagerABI,
      functionName: 'withdraw',
      args: [amountWei],
    } as SimulateContractParameters<typeof ManagerABI.abi, 'withdraw'>;

    return [
      {
        action,
        chainId: config.chain.id,
        ...call,
      },
    ];
  }

  logger.error(`Invalid lock token action type: ${action}`);
  return [];
}
