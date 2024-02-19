import clsx from 'clsx';
import { ChartDataItem } from 'src/components/charts/chartData';
import { Color } from 'src/styles/Color';

export const PLACEHOLDER_BAR_CHART_ITEM = {
  label: 'None',
  value: 0,
  percentage: 100,
  color: Color.Grey,
};

export type ColoredChartDataItem = ChartDataItem & { color: string };

export function StackedBarChart({
  data,
  showBorder = true,
  height = 'h-2',
  className,
}: {
  data: Array<ColoredChartDataItem>;
  showBorder?: boolean;
  height?: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex', showBorder && 'border border-taupe-300 p-px', className)}>
      {data.map((item, index) => (
        <div
          key={index}
          style={{
            width: `${item.percentage || 0}%`,
            backgroundColor: item.color,
          }}
          className={clsx(item.label && 'tooltip', height)}
          data-tip={item.label}
        ></div>
      ))}
    </div>
  );
}
