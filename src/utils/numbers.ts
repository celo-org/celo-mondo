import BigNumber from 'bignumber.js';

export function toDecimal(value: number | string | bigint): number {
  return BigNumber(value.toString()).toNumber();
}

export function toHex(value: number | string | bigint): HexString {
  return BigNumber(value.toString()).decimalPlaces(0).toString(16) as HexString;
}

const FIXIDITY_NUMBER = new BigNumber('1000000000000000000000000'); // 10 ^ 24
export function fromFixidity(value: number | string | bigint | null | undefined): number {
  if (!value) return 0;
  return BigNumber(value.toString()).div(FIXIDITY_NUMBER).toNumber();
}

export function toFixidity(n: number | BigNumber | string | bigint): string {
  return FIXIDITY_NUMBER.times(n.toString()).integerValue(BigNumber.ROUND_FLOOR).toFixed(0);
}
