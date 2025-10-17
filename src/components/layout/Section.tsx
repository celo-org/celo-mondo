import { PropsWithChildren } from 'react';

export function Section({
  className,
  containerClassName,
  children,
}: PropsWithChildren<{ className?: string; containerClassName?: string }>) {
  return (
    <section className={`flex w-full grow flex-col items-stretch justify-start ${className}`}>
      <div
        className={`flex w-full max-w-screen-md flex-col self-center px-2 sm:px-4 ${containerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
