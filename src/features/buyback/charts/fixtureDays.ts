import { DailyMetrics } from 'src/features/buyback/types';

/** A synthetic day for the buyback UI tests, counted from 2026-04-09. */
export function fixtureDay(index: number, overrides: Partial<DailyMetrics> = {}): DailyMetrics {
  const date = new Date(Date.UTC(2026, 3, 9) + index * 86_400_000).toISOString().slice(0, 10);
  return {
    day: date,
    celoPriceUsd: 0.08 + (index % 10) / 1000,
    feesCollectedUsd: 3000 + index * 10,
    feesByCurrencyUsd: {
      CELO: 2000 + index * 10,
      USDT: 700,
      USDC: 100,
      USDm: 150,
      EURm: 30,
      other: 20,
    },
    l1CostUsd: 40,
    feesAfterExpensesUsd: 2960 + index * 10,
    opShareUsd: 444 + index * 1.5,
    communityFundUsd: 2500 + index * 10,
    communityFundCelo: 30_000 + index * 100,
    ...overrides,
  };
}

export const fixtureDays = (count: number): DailyMetrics[] =>
  Array.from({ length: count }, (_, i) => fixtureDay(i));
