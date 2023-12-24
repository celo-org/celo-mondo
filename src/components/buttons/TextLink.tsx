import Link from 'next/link';
import { PropsWithChildren } from 'react';

interface Props {
  href: string;
  className?: string;
}

export function TextLink(props: PropsWithChildren<Props>) {
  const { href, className } = props;

  return (
    <Link
      className={`cursor-pointer underline-offset-2 transition-all hover:underline active:opacity-80 ${className}`}
      href={href}
    >
      {props.children}
    </Link>
  );
}
