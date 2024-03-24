import { PropsWithChildren } from 'react';

export function H1({ children }: PropsWithChildren<unknown>) {
  return <h1 className="font-serif text-2xl sm:text-3xl">{children}</h1>;
}
