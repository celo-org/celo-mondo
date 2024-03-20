import clsx from 'clsx';

export function HeatmapLines({ data }: { data: any[] }) {
  return (
    <div className="flex w-full justify-between gap-[3px]">
      {data.map((value, index) => (
        <div
          key={index}
          className={clsx(
            'h-7 w-[4px] transition-all duration-1000',
            value ? 'bg-green-500' : 'bg-gray-300',
          )}
        />
      ))}
    </div>
  );
}
