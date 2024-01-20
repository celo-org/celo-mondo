import clsx from 'clsx';
import Image from 'next/image';
import { PropsWithChildren } from 'react';
import InfoIcon from 'src/images/icons/info-circle.svg';

export function TipBox({
  color,
  className,
  children,
}: PropsWithChildren<{ color: 'purple' | 'yellow'; className?: string }>) {
  return (
    <div className={clsx('flex space-x-1.5 p-2 text-xs', ColorToClassName[color], className)}>
      <Image src={InfoIcon} width={18} height={18} alt="tip" />
      <span>{children}</span>
    </div>
  );
}

const ColorToClassName = {
  purple: 'bg-purple-50',
  yellow: 'bg-yellow-500/50',
};
