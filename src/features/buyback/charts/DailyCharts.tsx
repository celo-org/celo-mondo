'use client';

import { compactNumber } from 'src/features/buyback/charts/scales';
import { TimeSeriesChart } from 'src/features/buyback/charts/TimeSeriesChart';
import { cumulativeCeloAccrued } from 'src/features/buyback/computeStats';
import { celo, formatPrice, priceUsd, usd } from 'src/features/buyback/format';
import { DailyMetrics } from 'src/features/buyback/types';

// Money flows take the green the headline figures use; the price, which is
// context rather than a flow, takes a blue. Both clear 3:1 on the white card
// and stay apart under every colour-vision deficiency (validated).
const FLOW_COLOR = '#20A144';
const PRICE_COLOR = '#2563eb';

interface DailyChartsProps {
  days: DailyMetrics[];
  /**
   * The cumulative CELO series for these days. A shorter period passes its
   * slice of the whole window's series, so the line still ends at the window
   * total instead of restarting from zero.
   */
  accrued?: number[];
}

/** The day-by-day view of the figures. */
export function DailyCharts({ days, accrued: accruedSlice }: DailyChartsProps) {
  if (days.length === 0) return null;
  const labels = days.map((d) => d.day);
  const accrued = accruedSlice ?? cumulativeCeloAccrued(days);

  return (
    <div className="space-y-4">
      <TimeSeriesChart
        title="CELO accrued for the Community Fund"
        description="Cumulative since the window opened, net of the Carbon Fund share"
        kind="area"
        color={FLOW_COLOR}
        days={labels}
        values={accrued}
        formatTick={compactNumber}
        formatValue={celo}
        tooltipRows={(i) => [
          { value: celo(accrued[i]), label: 'accrued to date' },
          { value: celo(days[i].communityFundCelo), label: 'that day' },
          { value: usd(days[i].communityFundUsd), label: 'that day, in USD' },
        ]}
      />
      <TimeSeriesChart
        title="Fees collected per day"
        description="USD value of sequencer fees, before L1 costs and the OP Superchain share"
        kind="bars"
        color={FLOW_COLOR}
        days={labels}
        values={days.map((d) => d.feesCollectedUsd)}
        formatTick={compactNumber}
        formatValue={usd}
        tooltipRows={(i) => [
          { value: usd(days[i].feesCollectedUsd), label: 'fees collected' },
          { value: usd(days[i].l1CostUsd), label: 'L1 costs' },
          { value: usd(days[i].feesAfterExpensesUsd), label: 'after basic expenses' },
        ]}
      />
      <TimeSeriesChart
        title="CELO price"
        description="Daily price used to convert that day's USD figures to CELO"
        kind="line"
        baseline="auto"
        color={PRICE_COLOR}
        days={labels}
        values={days.map((d) => d.celoPriceUsd)}
        formatTick={(value) => formatPrice(value)}
        formatValue={priceUsd}
        tooltipRows={(i) => [{ value: priceUsd(days[i].celoPriceUsd), label: 'CELO price' }]}
      />
    </div>
  );
}
