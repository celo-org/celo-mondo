import { fireEvent, render, screen, within } from '@testing-library/react';
import { monthlyStats } from 'src/features/buyback/computeStats';
import { describe, expect, it } from 'vitest';
import { fixtureDays } from './fixtureDays';
import { MonthlyStackedChart } from './MonthlyStackedChart';
import { MonthlyTable } from './MonthlyTable';

// 2026-04-09 to 2026-06-07: April and June partial, May whole.
const months = monthlyStats(fixtureDays(60));

describe('MonthlyStackedChart', () => {
  it('stacks six currency segments per month under a six-entry legend', () => {
    render(<MonthlyStackedChart months={months} />);
    const groups = document.querySelectorAll('[data-mark="month"]');
    expect(groups).toHaveLength(3);
    groups.forEach((group) =>
      expect(group.querySelectorAll('[data-mark="segment"]')).toHaveLength(6),
    );
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['CELO', 'USDT', 'USDC', 'USDm', 'EURm', 'Other']);
    const chart = screen.getByRole('img');
    expect(within(chart).getByText('Apr')).toBeInTheDocument();
    expect(within(chart).getByText('May')).toBeInTheDocument();
    expect(within(chart).getByText('Jun')).toBeInTheDocument();
  });

  it('lists every currency, the total and the counted days of the month in focus', () => {
    render(<MonthlyStackedChart months={months} />);
    const chart = screen.getByRole('img');
    fireEvent.focus(chart);
    const tooltip = within(chart).getByRole('status');
    expect(tooltip).toHaveTextContent('June 2026');
    expect(tooltip).toHaveTextContent('7 of 30 days');
    for (const name of ['CELO', 'USDT', 'USDC', 'USDm', 'EURm', 'Other', 'total']) {
      expect(tooltip).toHaveTextContent(name);
    }
    expect(tooltip).toHaveTextContent('4,900 USD USDT');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(within(chart).getByRole('status')).toHaveTextContent('May 2026');
    expect(within(chart).getByRole('status')).not.toHaveTextContent('of 31');
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(within(chart).queryByRole('status')).toBeNull();
  });
});

describe('MonthlyTable', () => {
  it('lists the months newest first, with partial months as N of M days', () => {
    render(<MonthlyTable months={months} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
      'June 2026',
      'May 2026',
      'April 2026',
    ]);
    const daysCell = (row: HTMLElement) => within(row).getAllByRole('cell')[1].textContent;
    expect(daysCell(rows[0])).toBe('7 of 30');
    expect(daysCell(rows[1])).toBe('31');
    expect(daysCell(rows[2])).toBe('22 of 30');
  });
});
