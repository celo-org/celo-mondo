import { PropsWithChildren } from 'react';
import { Amount } from 'src/components/numbers/Amount';
import { useIsMobile } from 'src/styles/mediaQueries';

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
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex flex-1 flex-col space-y-2 border border-taupe-300 p-2 sm:p-3 ${className}`}
    >
      {header && <h3 className="text-sm">{header}</h3>}
      {!!valueWei && (
        <Amount valueWei={valueWei} className="text-xl md:text-2xl" decimals={isMobile ? 0 : 2} />
      )}
      {children}
    </div>
  );
}
