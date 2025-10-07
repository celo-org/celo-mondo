import clsx from 'clsx';
import { PropsWithChildren } from 'react';

// Call to action card
export function CtaCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={clsx(
        'grid w-full grid-cols-2 grid-rows-2 gap-x-6 gap-y-2 border border-taupe-300 bg-white bg-diamond-texture bg-right-bottom bg-no-repeat px-3 py-4 md:px-5 md:py-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
