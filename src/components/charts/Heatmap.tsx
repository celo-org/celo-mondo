import clsx from 'clsx';

// A simple grid of squares similar to Github's contribution graph
export function HeatmapSquares({
  rows,
  columns,
  data,
}: {
  rows: number;
  columns: number;
  data: any[];
}) {
  return (
    <div
      style={{
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
      className="grid w-full gap-1"
    >
      {data.map((value, index) => (
        <div
          key={index}
          className={clsx(
            'h-3 w-3 rounded-[1px] border border-gray-300 transition-all duration-1000 sm:h-4 sm:w-4 md:h-5 md:w-5',
            value ? 'bg-green-700' : 'bg-gray-400',
          )}
        />
      ))}
    </div>
  );
}
