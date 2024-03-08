import clsx from 'clsx';
import { PropsWithChildren, useState } from 'react';
import { objKeys } from 'src/utils/objects';
import { isNullish } from 'src/utils/typeof';

export function TabHeaderButton({
  isActive,
  count,
  onClick,
  children,
}: PropsWithChildren<{ isActive: boolean; onClick?: () => void; count?: number | string }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="relative flex items-center transition-all"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="font-medium">{children}</span>
      {!isNullish(count) && (
        <div
          className={clsx(
            'ml-2 min-w-[2rem] rounded-full border border-purple-500 text-xs font-light',
            (hover || isActive) && 'bg-purple-500 text-white',
          )}
        >
          {count}
        </div>
      )}
      {isActive && (
        <span className="absolute -bottom-[0.6rem] left-0 right-0 z-10 h-[2px] bg-purple-500"></span>
      )}
    </button>
  );
}

export function TabHeaderFilters<Filter extends string>({
  activeFilter,
  setFilter,
  counts,
  showCount = true,
  className,
}: {
  activeFilter: Filter;
  setFilter: (f: Filter) => void;
  counts: Record<Filter, number>;
  showCount?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between space-x-7 ${className}`}>
      {objKeys<Filter>(counts).map((f) => (
        <TabHeaderButton
          key={f}
          isActive={activeFilter === f}
          count={showCount ? counts[f] : undefined}
          onClick={() => setFilter(f)}
        >
          {f}
        </TabHeaderButton>
      ))}
    </div>
  );
}
