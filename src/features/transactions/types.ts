import type { TransactionReceipt } from 'viem';

export type TxPlan<A extends string = string, F extends string = string> = Array<{
  action: A;
  address: Address;
  abi: any;
  functionName: F;
  args?: Array<bigint | number | string | Address>;
  value?: bigint;
}>;

export interface ConfirmationDetails {
  message: string;
  amount?: bigint | number;
  receipt: TransactionReceipt;
  properties: Array<{ label: string; value: string }>;
}

export type OnConfirmedFn = (details: ConfirmationDetails) => void;
