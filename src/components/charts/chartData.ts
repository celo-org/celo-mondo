import { CHART_COLORS } from 'src/styles/Color';
import { sum } from 'src/utils/math';

export interface ChartDataItem {
  label: string;
  value: number;
  percentage?: number;
}

export function sortAndCombineChartData(data: Array<ChartDataItem>) {
  const maxNumItems = CHART_COLORS.length - 1;
  let sortedData = data.sort((a, b) => b.value - a.value);
  if (sortedData.length > maxNumItems) {
    const topData = sortedData.slice(0, maxNumItems);
    const combinedData = {
      label: 'Others',
      value: sum(sortedData.slice(maxNumItems).map((d) => d.value)),
      percentage: sum(sortedData.slice(maxNumItems).map((d) => d.percentage || 0)),
    };
    sortedData = [...topData, combinedData];
  }
  return sortedData.map((d, i) => ({ ...d, color: CHART_COLORS[i] }));
}
