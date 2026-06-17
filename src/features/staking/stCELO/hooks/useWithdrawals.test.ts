import { formatPendingWithdrawals } from 'src/features/staking/stCELO/hooks/useWithdrawals';
import { describe, expect, it } from 'vitest';

describe('formatPendingWithdrawals', () => {
  it('correctly pairs amounts with unsorted timestamps', () => {
    const values = [10n, 20n, 30n];
    const timestamps = [300n, 100n, 200n];

    const result = formatPendingWithdrawals(values, timestamps);

    // Sorted by timestamp: 100 (amount 20), 200 (amount 30), 300 (amount 10)
    // All within 300s window of first (100), so all grouped: 20+30+10=60
    // Timestamp updated to last: 300, then reversed (newest first)
    expect(result).toEqual([
      {
        amount: 60n,
        timestamp: '300',
        entries: [
          { amount: 20n, timestamp: '100' },
          { amount: 30n, timestamp: '200' },
          { amount: 10n, timestamp: '300' },
        ],
      },
    ]);
  });

  it('correctly handles already sorted timestamps', () => {
    const values = [10n, 20n, 30n];
    const timestamps = [100n, 200n, 300n];

    const result = formatPendingWithdrawals(values, timestamps);

    // Already sorted: 100 (amount 10), 200 (amount 20), 300 (amount 30)
    // All within 300s window of first (100), so all grouped: 10+20+30=60
    // Timestamp updated to last: 300, then reversed (newest first)
    expect(result).toEqual([
      {
        amount: 60n,
        timestamp: '300',
        entries: [
          { amount: 10n, timestamp: '100' },
          { amount: 20n, timestamp: '200' },
          { amount: 30n, timestamp: '300' },
        ],
      },
    ]);
  });

  it('groups withdrawals within 5-minute (300 second) window', () => {
    const values = [10n, 20n];
    const timestamps = [100n, 200n]; // 200 - 100 = 100 seconds, within 300 second window

    const result = formatPendingWithdrawals(values, timestamps);

    // Expected: grouped into one withdrawal with combined amount
    expect(result).toEqual([
      {
        amount: 30n,
        timestamp: '200',
        entries: [
          { amount: 10n, timestamp: '100' },
          { amount: 20n, timestamp: '200' },
        ],
      },
    ]);
  });

  it('returns empty array for empty input', () => {
    const values: bigint[] = [];
    const timestamps: bigint[] = [];

    const result = formatPendingWithdrawals(values, timestamps);

    expect(result).toEqual([]);
  });

  it('does not group withdrawals outside 5-minute window', () => {
    const values = [10n, 20n, 30n];
    const timestamps = [100n, 500n, 900n]; // 500-100=400s (outside), 900-500=400s (outside)

    const result = formatPendingWithdrawals(values, timestamps);

    // Expected: three separate withdrawals, reversed (newest first)
    expect(result).toEqual([
      { amount: 30n, timestamp: '900' },
      { amount: 20n, timestamp: '500' },
      { amount: 10n, timestamp: '100' },
    ]);
  });

  it('handles single withdrawal', () => {
    const values = [42n];
    const timestamps = [123n];

    const result = formatPendingWithdrawals(values, timestamps);

    expect(result).toEqual([{ amount: 42n, timestamp: '123' }]);
  });
});
