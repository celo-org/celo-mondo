import { config } from 'src/config/config';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { StCeloActionType } from 'src/features/staking/types';
import { TxPlan } from 'src/features/transactions/types';
import { Address, SimulateContractParameters } from 'viem';

export function changeStrategyTxPlan({ transferGroup }: { transferGroup: Address }): TxPlan {
  const call = {
    ...ManagerABI,
    functionName: 'changeStrategy',
    args: [transferGroup],
  } as SimulateContractParameters<typeof ManagerABI.abi, 'changeStrategy'>;

  return [
    {
      chainId: config.chain.id,
      action: StCeloActionType.ChangeStrategy,
      ...call,
    },
  ];
}
