import clsx from 'clsx';
import { PropsWithChildren, useState } from 'react';
import { objKeys } from 'src/utils/objects';
import { isNullish } from 'src/utils/typeof';
import useTabs from 'src/utils/useTabs';

export function TabHeaderButton({
  isActive,
  count,
  onClick,
  children,
}: PropsWithChildren<{ isActive: boolean; onClick?: () => void; count?: number | string }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      className="relative flex items-center"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="font-medium">{children}</span>
      {!isNullish(count) && (
        <div
          className={clsx(
            'ml-2 min-w-[2rem] rounded-full border border-purple-500 text-xs font-light transition-colors',
            (hover || isActive) && 'bg-purple-500 text-white',
          )}
        >
          {count}
        </div>
      )}
      <span
        className={clsx(
          'absolute -bottom-[0.6rem] left-0 right-0 z-10 h-[2px] bg-purple-500 transition-all',
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
  const { tab, onTabChange } = useTabs<Filter>(activeFilter);
  return (
    <div className={`flex justify-between space-x-7 ${className}`}>
      {objKeys<Filter>(counts).map((f) => (
        <TabHeaderButton
          key={f}
          isActive={tab === f}
          count={showCount ? counts[f] : undefined}
          onClick={() => {
            onTabChange(f);
            setFilter(f);
          }}
        >
          {f}
        </TabHeaderButton>
      ))}
    </div>
  );
}
