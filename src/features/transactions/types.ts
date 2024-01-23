import type { TransactionReceipt } from 'viem';

export enum TxModalType {
  Lock = 'lock',
  Stake = 'stake',
  Vote = 'vote',
  Delegate = 'delegate',
}

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
  amount: bigint | number;
  receipt: TransactionReceipt;
  properties: Array<{ label: string; value: string }>;
}
