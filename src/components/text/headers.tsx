import { PropsWithChildren } from 'react';

export function H1({ children }: PropsWithChildren<unknown>) {
  return <h1 className="font-serif text-3xl sm:text-4xl">{children}</h1>;
}
