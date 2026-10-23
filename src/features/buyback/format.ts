// Number formats shared by the buyback tables, charts and cards, so a figure
// reads the same wherever it appears.

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const price = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** A figure rounded to a whole number; a value just below zero reads "0", never "-0". */
export const formatWhole = (value: number): string => whole.format(Math.round(value) || 0);
/** A CELO price in USD, to the thousandth. */
export const formatPrice = (value: number): string => price.format(value);

export const usd = (value: number): string => `${formatWhole(value)} USD`;
export const celo = (value: number): string => `${formatWhole(value)} CELO`;
export const priceUsd = (value: number): string => `${formatPrice(value)} USD`;
