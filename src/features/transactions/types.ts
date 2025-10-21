import { TokenId } from 'src/config/tokens';
import type { TransactionReceipt } from 'viem';

export type TxPlan<A extends string = string, F extends string = string> = Array<{
  action: A;
  chainId: number;
  address: Address;
  abi: any;
  functionName: F;
  args?: ReadonlyArray<bigint | number | string | Address>;
  value?: bigint;
}>;

export interface ConfirmationDetails {
  message: string;
  amount?: bigint | number;
  tokenId?: TokenId;
  receipt: TransactionReceipt;
  properties: Array<{ label: string; value: string }>;
}

export type OnConfirmedFn = (details: ConfirmationDetails) => void;
