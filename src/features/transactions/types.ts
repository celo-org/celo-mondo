export enum TxModalType {
  Lock = 'lock',
  Stake = 'stake',
  Vote = 'vote',
  Delegate = 'delegate',
}

export type TxPlan<A extends string = string, F extends string = string> = Array<{
  action: A;
  functionName: F;
  args?: Array<bigint | number>;
  value?: bigint;
}>;
