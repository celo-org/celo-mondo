export interface DelegationAmount {
  expected: bigint;
  real: bigint;
}

export interface DelegationBalances {
  percentDelegated: bigint;
  delegateeToAmount: AddressTo<DelegationAmount>;
}
