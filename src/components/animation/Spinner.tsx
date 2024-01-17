import clsx from 'clsx';

type Size = 'xs' | 'sm' | 'md' | 'lg';

export function Spinner({ size, className }: { size: Size; className?: string }) {
  return <div className={clsx('loading loading-spinner', sizeToClass[size], className)}></div>;
}

const sizeToClass = {
  xs: 'loading-xs',
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
};
