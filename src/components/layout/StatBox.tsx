import { PropsWithChildren } from 'react';
import { Amount } from 'src/components/numbers/Amount';

export function StatBox({
  className,
  header,
  valueWei,
  children,
}: PropsWithChildren<{
  className?: string;
  bodyClassName?: string;
  valueWei?: string | bigint;
  header?: string;
}>) {
  return (
    <div
      className={`flex flex-1 flex-col space-y-2 border border-taupe-300 p-2 sm:p-3 ${className}`}
    >
      {header && <h3 className="text-sm">{header}</h3>}
      {!!valueWei && <Amount valueWei={valueWei} className="text-xl md:text-2xl" />}
      {children}
    </div>
  );
}
