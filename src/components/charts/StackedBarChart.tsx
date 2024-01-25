import { ChartDataItem } from 'src/components/charts/chartData';
import { Color } from 'src/styles/Color';

export const PLACEHOLDER_BAR_CHART_ITEM = {
  label: 'None',
  value: 0,
  percentage: 100,
  color: Color.Grey,
};

export function StackedBarChart({
  data,
}: {
  data: Array<ChartDataItem & { percentage?: number; color: string }>;
}) {
  return (
    <div className="flex border border-taupe-300 p-px">
      {data.map((item, index) => (
        <div
          key={index}
          style={{
            width: `${item.percentage || 0}%`,
            backgroundColor: item.color,
          }}
          className="tooltip h-2"
          data-tip={item.label}
        ></div>
      ))}
    </div>
  );
}
