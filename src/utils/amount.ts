import BigNumber from 'bignumber.js';
import { DEFAULT_DISPLAY_DECIMALS, DEFAULT_TOKEN_DECIMALS } from 'src/config/consts';
import { formatUnits, parseUnits } from 'viem';

/**
 * Convert the given Wei value to Ether value
 * @param value The value to convert.
 * @returns Converted value as a bigint, representing the whole units of the token (e.g., Ether).
 *          This function effectively truncates any fractional part of the token.
 */
export function fromWei(
  value: BigNumber.Value | bigint | null | undefined,
  decimals = DEFAULT_TOKEN_DECIMALS,
): bigint {
  if (!value) return 0n;
  // Wei value is expected to be an integer.
  // toString(10) is important for BigNumber instances to prevent scientific notation.
  const valueString = value.toString(10).trim();
  const weiAsBigInt = BigInt(valueString);

  const divisor = 10n ** BigInt(decimals);
  // Perform integer division to get the whole number of Ether units
  return weiAsBigInt / divisor;
}

/**
 * Convert the given Wei value to Ether value and return as a number.
 * This function reuses `fromWei` (which returns bigint) and converts the result to a number.
 * Be mindful of potential precision loss for very large values that exceed Number.MAX_SAFE_INTEGER.
 * @param value The value to convert.
 * @param decimals The number of decimals for the token (default is DEFAULT_TOKEN_DECIMALS).
 * @returns Converted value as a number.
 */
export function numberFromWei(
  value: BigNumber.Value | bigint | null | undefined,
  decimals = DEFAULT_TOKEN_DECIMALS,
): number {
  return Number(fromWei(value, decimals));
}

/**
 * Convert the given Wei value to Ether value,
 * round to set number of decimals with a minimum floor, configured per token
 * @param value The value to convert.
 * @param decimals
 * @returns Converted value in string type.
 */
export function fromWeiRounded(
  value: BigNumber.Value | bigint | null | undefined,
  decimals = DEFAULT_TOKEN_DECIMALS,
  displayDecimals?: number,
): string {
  if (!value) return '0';
  const flooredValue = BigNumber(value.toString()).toFixed(0, BigNumber.ROUND_FLOOR);
  const amount = BigNumber(formatUnits(BigInt(flooredValue), decimals));
  if (amount.isZero()) return '0';
  displayDecimals ??= amount.gte(10000) ? 2 : DEFAULT_DISPLAY_DECIMALS;
  return amount.toFixed(displayDecimals, BigNumber.ROUND_FLOOR);
}

/**
 * Convert the given value to Wei value
 * @param value The value to convert.
 * @returns Converted value in string type.
 */
export function toWei(
  value: BigNumber.Value | null | undefined,
  decimals = DEFAULT_TOKEN_DECIMALS,
): bigint {
  if (!value) return 0n;
  // First convert to a BigNumber, and then call `toString` with the
  // explicit radix 10 such that the result is formatted as a base-10 string
  // and not in scientific notation.
  const valueBN = BigNumber(value);
  const valueString = valueBN.toString(10).trim();
  const components = valueString.split('.');
  if (components.length === 1) {
    return parseUnits(valueString, decimals);
  } else if (components.length === 2) {
    const trimmedFraction = components[1].substring(0, decimals);
    return parseUnits(`${components[0]}.${trimmedFraction}`, decimals);
  } else {
    throw new Error(`Cannot convert ${valueString} to wei`);
  }
}

export function toWeiSafe(
  value: BigNumber.Value | null | undefined,
  decimals = DEFAULT_TOKEN_DECIMALS,
) {
  try {
    const safeValue = tryParseAmount(value);
    return toWei(safeValue, decimals);
  } catch (error) {
    return 0n;
  }
}

/**
 * Try to parse the given value into BigNumber.js BigNumber
 * @param value The value to parse.
 * @returns Parsed value in BigNumber.js BigNumber type.
 */
export function tryParseAmount(value: BigNumber.Value | null | undefined): BigNumber | null {
  try {
    if (!value) return null;
    const parsed = BigNumber(value);
    if (!parsed || parsed.isNaN() || !parsed.isFinite()) return null;
    else return parsed;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if an amount is equal of nearly equal to balance within a small margin of error
 * Necessary because amounts in the UI are often rounded
 * @param amount1 The amount to compare.
 * @param amount2 The amount to compare.
 * @returns true/false.
 */
export function eqAmountApproximate(
  amount1: BigNumber.Value,
  amount2: BigNumber.Value,
  maxDifference: BigNumber.Value,
): boolean {
  // Is difference btwn amounts less than maxDifference
  return BigNumber(amount1).minus(amount2).abs().lte(maxDifference);
}
