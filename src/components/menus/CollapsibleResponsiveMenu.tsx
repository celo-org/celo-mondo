import clsx from 'clsx';
import { PropsWithChildren, useState } from 'react';
import { ChevronIcon } from 'src/components/icons/Chevron';

export function CollapsibleResponsiveMenu({ children }: PropsWithChildren<unknown>) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-white lg:static lg:bg-transparent">
      <button
        onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
        className="flex-center w-full space-x-4 border-y border-taupe-300 py-2 lg:hidden"
      >
        <span>{isMenuCollapsed ? 'More' : 'Less'}</span>
        <ChevronIcon direction={isMenuCollapsed ? 'n' : 's'} width={15} height={10} />
      </button>
      <div
        className={clsx(
          'transition-all duration-300',
          isMenuCollapsed ? 'max-h-0 lg:max-h-none' : 'max-h-screen lg:max-h-none',
        )}
      >
        {children}
      </div>
    </div>
  );
}
