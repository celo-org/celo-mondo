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
      className="relative flex items-center justify-center md:justify-start"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="font-medium">{children}</span>
      {!isNullish(count) && (
        <div
          className={clsx(
            'ml-2 min-w-8 rounded-full border border-accent text-xs font-light transition-colors',
            (hover || isActive) && 'bg-accent text-white',
          )}
        >
          {count}
        </div>
      )}
      <span
        className={clsx(
          'absolute -bottom-[0.6rem] left-0 right-0 h-[2px] bg-accent transition-all',
          isActive ? 'w-full' : 'w-0',
        )}
      />
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
    <div className={`grid grid-flow-row grid-cols-2 gap-x-7 gap-y-6 lg:grid-cols-4 ${className}`}>
      {objKeys<Filter>(counts).map((f) => (
        <TabHeaderButton
          key={f}
          isActive={activeFilter === f}
          count={showCount ? counts[f] : undefined}
          onClick={() => {
            setFilter(f);
          }}
        >
          {f}
        </TabHeaderButton>
      ))}
    </div>
  );
}
