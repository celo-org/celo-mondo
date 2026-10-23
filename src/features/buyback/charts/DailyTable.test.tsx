import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dailyCsv, dailyCsvFilename } from './dailyCsv';
import { DailyTable } from './DailyTable';
import { fixtureDay, fixtureDays } from './fixtureDays';

const days = fixtureDays(60);

describe('DailyTable', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists every day newest first, with the OP share', () => {
    render(<DailyTable days={days} />);
    expect(screen.getByText('Daily figures (60 days)')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(60);
    expect(rows[0]).toHaveTextContent('2026-06-07');
    const cells = within(rows[59])
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells).toEqual([
      '2026-04-09',
      '3,000',
      '40',
      '2,960',
      '444',
      '30,000',
      '2,500',
      '0.080',
    ]);
  });

  it('builds the CSV from the unrounded figures, oldest first', () => {
    const rows = [fixtureDay(0, { opShareUsd: 444.123456 }), fixtureDay(1)];
    const lines = dailyCsv(rows).trimEnd().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'day,celo_price_usd,fees_collected_usd,fees_celo_usd,fees_usdt_usd,fees_usdc_usd,fees_usdm_usd,fees_eurm_usd,fees_other_usd,l1_cost_usd,fees_after_expenses_usd,op_share_estimate_usd,community_fund_usd,community_fund_celo',
    );
    expect(lines[1]).toBe(
      '2026-04-09,0.08,3000,2000,700,100,150,30,20,40,2960,444.123456,2500,30000',
    );
    expect(lines[2].startsWith('2026-04-10,')).toBe(true);
    expect(dailyCsvFilename(rows)).toBe('celo-buyback-daily-2026-04-09-2026-04-10.csv');
  });

  it('downloads the rows it shows as a CSV file', async () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:buyback';
    });
    const revokeObjectURL = vi.fn();
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<DailyTable days={days.slice(-3)} />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
      // The URL is revoked once the download has had a chance to start.
      await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:buyback'));
    } finally {
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
    }

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('celo-buyback-daily-2026-06-05-2026-06-07.csv');
    const text = await blobs[0].text();
    const lines = text.trimEnd().split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[1].startsWith('2026-06-05,')).toBe(true);
    expect(lines[3].startsWith('2026-06-07,')).toBe(true);
  });
});
