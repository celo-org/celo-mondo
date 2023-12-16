import { PropsWithChildren } from 'react';

export function Section({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={`flex w-full grow items-center ${className}`}>
      <div className="mx-auto max-w-screen-xl px-2 sm:px-4">{children}</div>
    </section>
  );
}
