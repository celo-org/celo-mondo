import { TokenId } from 'src/config/tokens';
import type { SimulateContractParameters, TransactionReceipt } from 'viem';

export type TxPlan<A extends string = string> = Array<
  {
    action: A;
    chainId: number;
  } & SimulateContractParameters
>;

export interface ConfirmationDetails {
  message: string;
  amount?: bigint | number;
  tokenId?: TokenId;
  receipt: TransactionReceipt;
  properties: Array<{ label: string; value: string }>;
}

export type OnConfirmedFn = (details: ConfirmationDetails) => void;
