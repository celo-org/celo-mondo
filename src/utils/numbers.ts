import BigNumber from 'bignumber.js';

export function toDecimal(value: number | string | bigint): number {
  return BigNumber(value.toString()).toNumber();
}

export function toHex(value: number | string | bigint): HexString {
  return BigNumber(value.toString()).decimalPlaces(0).toString(16) as HexString;
}
