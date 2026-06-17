import clsx from 'clsx';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded bg-taupe-300', className)} />;
}

export function SkeletonText({ className }: { className?: string }) {
  return <div className={clsx('h-4 animate-pulse rounded bg-taupe-300', className)} />;
}

export function SkeletonCircle({ size = 30 }: { size?: number }) {
  return (
    <div
      className="animate-pulse rounded-full bg-taupe-300"
      style={{ width: size, height: size }}
    />
  );
}
