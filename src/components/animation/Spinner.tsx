import clsx from 'clsx';
import { PropsWithChildren } from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg';

export function Spinner({ size, className }: { size: Size; className?: string }) {
  return <div className={clsx('loading loading-spinner', sizeToClass[size], className)}></div>;
}

export function SpinnerWithLabel({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`flex flex-1 flex-col items-center ${className}`}>
      <Spinner size="lg" />
      <span className="mt-4 text-center text-xs text-gray-500">{children}</span>
    </div>
  );
}

export function FullWidthSpinner({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`flex justify-center py-16 ${className}`}>
      <SpinnerWithLabel>{children}</SpinnerWithLabel>
    </div>
  );
}

const sizeToClass = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
};
