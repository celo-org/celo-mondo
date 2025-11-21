import Link, { LinkProps } from 'next/link';
import { PropsWithChildren } from 'react';

interface Props extends LinkProps {
  href: string;
  className?: string;
}

export function TextLink({ href, className, children, ...props }: PropsWithChildren<Props>) {
  return (
    <Link
      className={`cursor-pointer underline-offset-2 transition-all hover:underline active:opacity-80 ${className}`}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
