import { PropsWithChildren } from 'react';

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`card rounded-none bg-white shadow ${className}`}>
      <div className="card-body">{children}</div>
    </div>
  );
}
