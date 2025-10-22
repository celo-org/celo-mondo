import { config } from 'src/config/config';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { LiquidStakeActionType, LiquidStakeFormValues } from 'src/features/staking/types';
import { TxPlan } from 'src/features/transactions/types';
import { SimulateContractParameters } from 'viem';

export function getLiquidStakeTxPlan(values: LiquidStakeFormValues): TxPlan {
  const { transferGroup } = values;

  const call = {
    address: ManagerABI.address,
    abi: ManagerABI.abi,
    functionName: 'changeStrategy',
    args: [transferGroup],
  } as SimulateContractParameters<typeof ManagerABI.abi, 'changeStrategy'>;

  return [
    {
      chainId: config.chain.id,
      action: LiquidStakeActionType.ChangeStrategy,
      ...call,
    },
  ];
}
