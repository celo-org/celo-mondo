import clsx from 'clsx';
import { PropsWithChildren } from 'react';

export function Section({
  className,
  containerClassName,
  children,
  ...props
}: PropsWithChildren<{ className?: string; containerClassName?: string }>) {
  return (
    <section
      className={clsx('flex w-full grow flex-col items-stretch justify-start', className)}
      {...props}
    >
      <div
        className={clsx(
          'flex w-full flex-col justify-center self-center px-2 sm:px-4',
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
