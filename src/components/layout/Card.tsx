import { PropsWithChildren } from 'react';

export function Card({
  className,
  bodyClassName,
  children,
}: PropsWithChildren<{ className?: string; bodyClassName?: string }>) {
  return (
    <div className={`card rounded-none bg-white shadow-sm ${className}`}>
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}
