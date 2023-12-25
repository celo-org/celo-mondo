import { PropsWithChildren } from 'react';

export function Circle({
  size,
  fill,
  title,
  className,
  children,
}: PropsWithChildren<{
  size: string | number;
  fill?: string;
  title?: string;
  className?: string;
}>) {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px`, backgroundColor: fill }}
      className={`flex items-center justify-center overflow-hidden rounded-full transition-all ${className}`}
      title={title}
    >
      {children}
    </div>
  );
}
