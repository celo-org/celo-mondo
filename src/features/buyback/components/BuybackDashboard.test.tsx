import { fireEvent, render, screen, within } from '@testing-library/react';
import { fixtureDays } from 'src/features/buyback/charts/fixtureDays';
import { BuybackStats, InitialPeriod, PeriodStats } from 'src/features/buyback/types';
import { BuybackStatsState } from 'src/features/buyback/useBuybackStats';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BuybackDashboard } from './BuybackDashboard';

const hook = vi.hoisted(() => ({ state: undefined as unknown as BuybackStatsState }));
vi.mock('src/features/buyback/useBuybackStats', () => ({ useBuybackStats: () => hook.state }));

const totals: PeriodStats = {
  feesCollectedUsd: 678_037,
  l1CostUsd: 9_205,
  feesAfterExpensesUsd: 668_832,
  opShareUsd: 100_325,
  carbonFundUsd: 2_017.75,
  carbonFundCelo: 24_086.79,
  celoToCommunityFund: 7_571_214,
  usdToCommunityFund: 566_490,
  avgCeloPriceUsd: 0.07482,
};
const latestDayStats: PeriodStats = {
  ...totals,
  feesCollectedUsd: 5_304,
  l1CostUsd: 72,
  carbonFundUsd: 0,
  carbonFundCelo: 0,
  celoToCommunityFund: 42_279,
};
const days = fixtureDays(120); // 2026-04-09 to 2026-08-06
// The first period, in the proportions of the real one.
const initial: InitialPeriod = {
  sinceDay: '2025-03-26',
  throughDay: '2026-04-08',
  days: 379,
  stats: {
    feesCollectedUsd: 554_629,
    l1CostUsd: 24_484,
    feesAfterExpensesUsd: 530_145,
    opShareUsd: 79_585,
    carbonFundUsd: 0,
    carbonFundCelo: 0,
    celoToCommunityFund: 2_066_747,
    usdToCommunityFund: 450_561,
    avgCeloPriceUsd: 0.218,
  },
};

function show(overrides: Partial<BuybackStats> = {}) {
  hook.state = {
    // A row stored before a field existed lacks it, hence the cast.
    stats: {
      totals,
      latestDayStats,
      sinceDay: '2026-04-09',
      latestDay: '2026-08-06',
      days,
      initial,
      settled: {
        celo: 5_000_000,
        transfers: 3,
        lastTransferAt: '2026-09-30T12:00:00Z',
        throughBlock: 1,
      },
      updatedAt: '2026-08-07T05:31:00Z',
      ...overrides,
    } as BuybackStats,
    view: 'stats',
    refreshFailed: false,
    isStale: false,
  };
  return render(<BuybackDashboard />);
}

const dailyRows = () =>
  within(screen.getByText(/^Daily figures/).closest('details')!)
    .getAllByRole('row')
    .slice(1);

describe('BuybackDashboard', () => {
  beforeEach(() => {
    hook.state = { stats: undefined, view: 'loading', refreshFailed: false, isStale: false };
  });

  it('lists every totals row in order, since the window start', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Since 2026-04-09' })).toBeInTheDocument();
    const rows = screen.getAllByTestId('totals-row');
    expect(rows.map((r) => r.firstChild?.textContent)).toEqual([
      'Fees collected',
      'L1 operating costs',
      'OP Superchain share (estimate)',
      'Carbon Fund share (one-off, 2026-04-20)',
      'USD value accrued for the Community Fund',
      'CELO accrued for the Community Fund',
      'Average CELO price',
    ]);
    expect(rows[1]).toHaveTextContent('9,205 USD');
    expect(rows[1]).toHaveTextContent('72 USD');
    expect(rows[3]).toHaveTextContent('2,018 USD');
    // The one-off share is a zero on any later day, not a gap.
    expect(rows[3]).toHaveTextContent('2,018 USD');
    expect(rows[3]).toHaveTextContent('0 USD');
    expect(rows[3]).not.toHaveTextContent('—');
    expect(rows[5]).toHaveTextContent('7,571,214 CELO');
  });

  it('sets the first period, the window and all time side by side', () => {
    show();
    expect(screen.getByText(/The totals and charts start on 2026-04-09/)).toBeInTheDocument();
    const table = screen.getByRole('region', { name: 'Since the L2 launch (2025-03-26)' });
    expect(table).toHaveTextContent('2025-03-26 to 2026-04-08');
    expect(table).toHaveTextContent('Since 2026-04-09');
    expect(table).toHaveTextContent('All time');
    const rows = screen.getAllByTestId('all-time-row');
    expect(rows.map((r) => r.firstChild?.textContent)).toEqual([
      'Fees collected',
      'L1 operating costs',
      'OP Superchain share (estimate)',
      'USD value accrued for the Community Fund',
      'CELO accrued for the Community Fund (estimate)',
      'CELO transferred to the Community Fund',
    ]);
    const cells = (row: HTMLElement) =>
      [...row.querySelectorAll('span.whitespace-nowrap')].map((c) => c.textContent);
    expect(cells(rows[0])).toEqual([
      'First period: 554,629 USD',
      'Since 2026-04-09: 678,037 USD',
      'All time: 1,232,666 USD',
    ]);
    expect(cells(rows[1])).toEqual([
      'First period: 24,484 USD',
      'Since 2026-04-09: 9,205 USD',
      'All time: 33,689 USD',
    ]);
    expect(cells(rows[4])).toEqual([
      'First period: 2,066,747 CELO',
      'Since 2026-04-09: 7,571,214 CELO',
      'All time: 9,637,961 CELO',
    ]);
    // Transferred: the CGP-234 return, the batches read from the chain, both.
    expect(cells(rows[5])).toEqual([
      'First period: 1,748,950 CELO',
      'Since 2026-04-09: 5,000,000 CELO',
      'All time: 6,748,950 CELO',
    ]);
    expect(table).toHaveTextContent('settled by a single return of 1,748,950 CELO on 2026-04-01');
    expect(within(table).getByRole('link', { name: 'CGP-234' })).toHaveAttribute(
      'href',
      '/governance/cgp-234',
    );
    expect(within(table).getByRole('link', { name: 'transaction' })).toHaveAttribute(
      'href',
      'https://celoscan.io/tx/0xfbe1dac031726b6f580b561bfc2a80262b9529d09e4463fc3600cc74dce31a86',
    );
    expect(screen.getByText(/Data 2025-03-26 to 2026-08-06/)).toBeInTheDocument();
  });

  it('leaves the transferred cells of the window and all time empty when the chain was not read', () => {
    show({ settled: null });
    const transferred = screen.getAllByTestId('all-time-row')[5];
    expect(transferred).toHaveTextContent('1,748,950 CELO');
    expect(transferred.textContent?.match(/—/g)).toHaveLength(2);
  });

  it('shows the window table and charts for a row stored before the first period was computed', () => {
    show({ initial: undefined });
    expect(screen.getByRole('heading', { name: 'Since 2026-04-09' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Since the L2 launch/ })).toBeNull();
    expect(screen.getByRole('group', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getByText(/Data 2026-04-09 to 2026-08-06/)).toBeInTheDocument();
  });

  it('sets the on-chain transfers against the estimate', () => {
    show();
    const card = screen.getByRole('region', { name: 'Transferred to the Community Fund so far' });
    expect(card).toHaveTextContent('5,000,000 CELO');
    expect(card).toHaveTextContent('3 transfers, last on 2026-09-30');
    expect(card).toHaveTextContent('7,571,214 CELO');
    expect(card).toHaveTextContent('2,571,214 CELO');
    expect(card).toHaveTextContent(
      'With the 1,748,950 CELO returned for the first period (CGP-234), the Community Fund has received 6,748,950 CELO in all.',
    );
    expect(within(card).getByRole('link', { name: 'Operations Safe' })).toHaveAttribute(
      'href',
      'https://celoscan.io/address/0x7A1E98FC9a008107DbD1f430a05Ace8cf6f3FE19',
    );
    expect(
      within(card).getByRole('link', { name: 'Community Fund (Governance contract)' }),
    ).toHaveAttribute(
      'href',
      'https://celoscan.io/address/0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972',
    );
  });

  it('says when no batch has been transferred yet', () => {
    show({ settled: { celo: 0, transfers: 0, lastTransferAt: null, throughBlock: 1 } });
    const card = screen.getByRole('region', { name: 'Transferred to the Community Fund so far' });
    expect(card).toHaveTextContent('no batch transfer yet');
    expect(card).toHaveTextContent('Not yet transferred7,571,214 CELO');
  });

  it('says when a batch has run ahead of the estimate, which stops at the last complete day', () => {
    show({ settled: { celo: 7_600_000, transfers: 4, lastTransferAt: null, throughBlock: 1 } });
    const card = screen.getByRole('region', { name: 'Transferred to the Community Fund so far' });
    expect(card).toHaveTextContent('Transferred ahead of the estimate28,786 CELO');
    expect(card).not.toHaveTextContent('Not yet transferred');
    expect(card).not.toHaveTextContent('-28,786');
  });

  it('shows the totals but no charts for a row stored before the daily breakdown existed', () => {
    const legacy = days.map(({ feesByCurrencyUsd: _fees, opShareUsd: _op, ...rest }) => rest);
    show({ days: legacy as typeof days });
    expect(screen.getAllByTestId('totals-row')[0]).toHaveTextContent('Fees collected');
    expect(screen.queryByRole('group', { name: 'Period' })).toBeNull();
    expect(screen.queryByText(/^Daily figures/)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('says when the transfers were not read', () => {
    show({ settled: null });
    const card = screen.getByRole('region', { name: 'Transferred to the Community Fund so far' });
    expect(card).toHaveTextContent('On-chain transfers not read');
    expect(card).not.toHaveTextContent('Not yet transferred');
    expect(card).not.toHaveTextContent('in all');
  });

  it('scopes the charts and tables below the selector to the chosen period', () => {
    show();
    const all = screen.getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(dailyRows()).toHaveLength(120);

    fireEvent.click(screen.getByRole('button', { name: '30 days' }));
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(dailyRows()).toHaveLength(30);
    expect(dailyRows()[29]).toHaveTextContent('2026-07-08');
    const [accrued, fees] = screen.getAllByRole('img');
    expect(accrued.getAttribute('aria-label')).toContain('2026-07-08 to 2026-08-06');
    expect(fees.querySelectorAll('[data-mark="bar"]')).toHaveLength(30);
    expect(document.querySelectorAll('[data-mark="month"]')).toHaveLength(2);
    // The totals above the selector keep the whole window.
    expect(screen.getAllByTestId('totals-row')[0]).toHaveTextContent('678,037 USD');

    fireEvent.click(screen.getByRole('button', { name: '90 days' }));
    expect(dailyRows()).toHaveLength(90);
    expect(dailyRows()[89]).toHaveTextContent('2026-05-09');
  });

  it('explains how the figures are computed', () => {
    show();
    const details = screen.getByText('How these figures are computed').closest('details')!;
    expect(details).toHaveTextContent('greater of 2.5% of fees and 15% of fees after L1 costs');
    expect(details).toHaveTextContent('24,086.79 CELO / 2,017.75 USD');
    expect(details).toHaveTextContent(
      'from the L2 launch (2025-03-26) through 2026-04-08, was returned to the Community Fund in a single transfer of 1,748,950 CELO on 2026-04-01',
    );
    expect(within(details).getByRole('link', { name: 'CGP-236' })).toHaveAttribute(
      'href',
      '/governance/cgp-236',
    );
    expect(within(details).getByRole('link', { name: 'Carbon Fund' })).toHaveAttribute(
      'href',
      'https://celoscan.io/address/0xCe10d577295d34782815919843a3a4ef70Dc33ce',
    );
  });

  it('shows the unavailable notice when nothing has loaded', () => {
    hook.state = { stats: undefined, view: 'error', refreshFailed: false, isStale: false };
    render(<BuybackDashboard />);
    expect(
      screen.getByText(
        /Buyback stats are not available yet\. They are refreshed once a day at 05:30 UTC/,
      ),
    ).toBeInTheDocument();
  });
});
