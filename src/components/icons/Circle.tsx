import { PropsWithChildren } from 'react';

export function Circle({
  size,
  title,
  classes,
  children,
}: PropsWithChildren<{
  size: string | number;
  title?: string;
  classes?: string;
}>) {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`flex items-center justify-center overflow-hidden rounded-full transition-all ${classes}`}
      title={title}
    >
      {children}
    </div>
  );
}
