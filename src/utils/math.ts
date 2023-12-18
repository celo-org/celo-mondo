import BigNumber from 'bignumber.js';

export function sum(a: readonly number[]): number {
  return a.reduce((acc, val) => acc + val);
}

export function mean(a: readonly number[]): number {
  return Number(sum(a)) / a.length;
}

export function bigIntSum(a: readonly number[] | readonly bigint[]): bigint {
  return BigInt(a.reduce((acc, val) => acc.plus(val.toString()), new BigNumber(0)).toFixed(0));
}

export function bigIntMean(a: readonly number[] | readonly bigint[]): bigint {
  return bigIntSum(a) / BigInt(a.length);
}

export function bigIntMax(...args: bigint[]): bigint {
  return args.reduce((m, e) => (e > m ? e : m));
}

export function bigIntMin(...args: bigint[]): bigint {
  return args.reduce((m, e) => (e < m ? e : m));
}
