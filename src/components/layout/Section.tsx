import { PropsWithChildren } from 'react';

export function Section({
  className,
  containerClassName,
  children,
}: PropsWithChildren<{ className?: string; containerClassName?: string }>) {
  return (
    <section className={`flex w-full grow flex-col items-stretch justify-start ${className}`}>
      <div
        className={`flex w-full flex-col self-center px-2 sm:px-4 xl:max-w-screen-xl ${containerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
