import { fireEvent, render, screen, within } from '@testing-library/react';
import { CARBON_FUND_SHARE_IN_WINDOW } from 'src/features/buyback/computeStats';
import { DailyMetrics } from 'src/features/buyback/types';
import { describe, expect, it } from 'vitest';
import { DailyCharts } from './DailyCharts';

function day(index: number, overrides: Partial<DailyMetrics> = {}): DailyMetrics {
  const date = new Date(Date.UTC(2026, 3, 9) + index * 86_400_000).toISOString().slice(0, 10);
  return {
    day: date,
    celoPriceUsd: 0.08 + (index % 10) / 1000,
    feesCollectedUsd: 3000 + index * 10,
    l1CostUsd: 40,
    feesAfterExpensesUsd: 2960 + index * 10,
    communityFundUsd: 2500 + index * 10,
    communityFundCelo: 30_000 + index * 100,
    ...overrides,
  };
}
const days = Array.from({ length: 60 }, (_, i) => day(i));
const total = (pick: (d: DailyMetrics) => number) => days.reduce((sum, d) => sum + pick(d), 0);
const whole = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value));

describe('DailyCharts', () => {
  it('renders nothing without a daily series', () => {
    const { container } = render(<DailyCharts days={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws one chart per figure, each named and described without a legend', () => {
    render(<DailyCharts days={days} />);
    const charts = screen.getAllByRole('img');
    expect(charts.map((c) => c.getAttribute('aria-label'))).toEqual([
      `CELO accrued for the Community Fund, 2026-04-09 to 2026-06-07, latest ${whole(total((d) => d.communityFundCelo) - CARBON_FUND_SHARE_IN_WINDOW.celo)} CELO`,
      `Fees collected per day, 2026-04-09 to 2026-06-07, latest ${whole(days[59].feesCollectedUsd)} USD`,
      'CELO price, 2026-04-09 to 2026-06-07, latest 0.089 USD',
    ]);
    expect(document.querySelectorAll('[data-mark="bar"]')).toHaveLength(60);
    expect(document.querySelectorAll('[data-mark="area"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-mark="line"]')).toHaveLength(1);
  });

  it('labels the end of the cumulative series with the window total', () => {
    render(<DailyCharts days={days} />);
    const endpoint = whole(total((d) => d.communityFundCelo) - CARBON_FUND_SHARE_IN_WINDOW.celo);
    expect(screen.getAllByText(`${endpoint} CELO`).length).toBeGreaterThan(0);
  });

  it('labels the axes with clean ticks and month starts', () => {
    render(<DailyCharts days={days} />);
    const [accrued] = screen.getAllByRole('img');
    expect(within(accrued).getByText('May')).toBeInTheDocument();
    expect(within(accrued).getByText('Jun')).toBeInTheDocument();
    expect(within(accrued).getByText('0')).toBeInTheDocument();
  });

  it('shows every figure of the day under the pointer, and lifts the hovered bar', () => {
    render(<DailyCharts days={days} />);
    const [, fees] = screen.getAllByRole('img');
    // The container measures 0 wide in this DOM, so the pointer lands on the first band.
    fireEvent.pointerMove(fees, { clientX: 57 });
    const tooltip = within(fees).getByRole('status');
    expect(tooltip).toHaveTextContent('2026-04-09');
    expect(tooltip).toHaveTextContent('3,000 USD fees collected');
    expect(tooltip).toHaveTextContent('40 USD L1 costs');
    expect(tooltip).toHaveTextContent('2,960 USD after basic expenses');
    const bars = fees.querySelectorAll('[data-mark="bar"]');
    expect(bars[0].getAttribute('opacity')).toBe('0.7');
    expect(bars[1].getAttribute('opacity')).toBe('1');

    fireEvent.pointerLeave(fees);
    expect(within(fees).queryByRole('status')).toBeNull();
  });

  it('is readable from the keyboard: focus selects the latest day, arrows move it', () => {
    render(<DailyCharts days={days} />);
    const [accrued] = screen.getAllByRole('img');
    fireEvent.focus(accrued);
    expect(within(accrued).getByRole('status')).toHaveTextContent('2026-06-07');
    fireEvent.keyDown(accrued, { key: 'ArrowLeft' });
    expect(within(accrued).getByRole('status')).toHaveTextContent('2026-06-06');
    fireEvent.keyDown(accrued, { key: 'Home' });
    expect(within(accrued).getByRole('status')).toHaveTextContent('2026-04-09');
    fireEvent.keyDown(accrued, { key: 'ArrowLeft' });
    expect(within(accrued).getByRole('status')).toHaveTextContent('2026-04-09');
    fireEvent.keyDown(accrued, { key: 'End' });
    expect(within(accrued).getByRole('status')).toHaveTextContent('2026-06-07');
    fireEvent.keyDown(accrued, { key: 'Escape' });
    expect(within(accrued).queryByRole('status')).toBeNull();
    fireEvent.keyDown(accrued, { key: 'ArrowRight' });
    expect(within(accrued).getByRole('status')).toHaveTextContent('2026-06-07');
    fireEvent.blur(accrued);
    expect(within(accrued).queryByRole('status')).toBeNull();
  });

  it('backs the charts with a table of every day, newest first', () => {
    render(<DailyCharts days={days} />);
    expect(screen.getByText('Daily figures (60 days)')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(60);
    expect(rows[0]).toHaveTextContent('2026-06-07');
    expect(rows[59]).toHaveTextContent('2026-04-09');
    const cells = within(rows[59])
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells).toEqual(['2026-04-09', '3,000', '40', '2,960', '30,000', '2,500', '0.080']);
  });

  it('keeps a loss day below the baseline instead of hiding it', () => {
    const withLoss = days.map((d, i) =>
      i === 5 ? { ...d, communityFundCelo: -500, communityFundUsd: -40 } : d,
    );
    render(<DailyCharts days={withLoss} />);
    const [accrued] = screen.getAllByRole('img');
    fireEvent.focus(accrued);
    fireEvent.keyDown(accrued, { key: 'Home' });
    for (let i = 0; i < 5; i++) fireEvent.keyDown(accrued, { key: 'ArrowRight' });
    expect(within(accrued).getByRole('status')).toHaveTextContent('-500 CELO that day');
  });
});
