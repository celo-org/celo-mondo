import clsx from 'clsx';
import { PropsWithChildren } from 'react';

// Call to action card
export function CtaCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between space-x-6 border border-taupe-300 bg-white bg-diamond-texture bg-right-bottom bg-no-repeat px-3 py-4 md:px-5 md:py-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
