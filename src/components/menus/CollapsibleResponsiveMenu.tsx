import clsx from 'clsx';
import { PropsWithChildren, useState } from 'react';
import { ChevronIcon } from 'src/components/icons/Chevron';

type Props = {
  defaultCollapsed?: boolean;
};

export function CollapsibleResponsiveMenu({
  children,
  defaultCollapsed = false,
}: PropsWithChildren<Props>) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(defaultCollapsed);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex max-h-full flex-col bg-white md:z-10 lg:static lg:block lg:max-h-none lg:bg-transparent">
      <button
        onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
        className="flex-center w-full shrink-0 space-x-4 border-y border-taupe-300 py-2 lg:hidden"
      >
        <span>{isMenuCollapsed ? 'More' : 'Less'}</span>
        <ChevronIcon direction={isMenuCollapsed ? 'n' : 's'} width={15} height={10} />
      </button>
      <div
        className={clsx(
          'min-h-0 transition-all duration-300 lg:max-h-none lg:overflow-visible',
          isMenuCollapsed
            ? 'max-h-0 overflow-hidden'
            : 'max-h-screen flex-1 overflow-y-auto overscroll-contain',
        )}
      >
        {children}
      </div>
    </div>
  );
}
