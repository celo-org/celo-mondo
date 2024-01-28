import { PropsWithChildren } from 'react';

export function HeaderAndSubheader({
  header,
  subHeader,
  children,
  className,
}: PropsWithChildren<{ header: string; subHeader: string; className?: string }>) {
  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      <h3 className="text-center font-medium">{header}</h3>
      <p className="max-w-[22rem] text-center text-sm text-taupe-600">{subHeader}</p>
      {children}
    </div>
  );
}
