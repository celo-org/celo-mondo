import { PropsWithChildren } from 'react';

export function Circle({
  size,
  title,
  className,
  children,
}: PropsWithChildren<{
  size: string | number;
  title?: string;
  className?: string;
}>) {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`flex items-center justify-center overflow-hidden rounded-full transition-all ${className}`}
      title={title}
    >
      {children}
    </div>
  );
}
