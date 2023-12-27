import clsx from 'clsx';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function OutlineButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={clsx(OutlineButtonClassName, className)} {...props}>
      {children}
    </button>
  );
}

export const OutlineButtonClassName = `btn btn-outline outline-none h-fit min-h-fit rounded-full border-taupe-300 px-4 py-2.5 font-semibold text-black hover:border-taupe-400 hover:bg-black/5 hover:text-black`;
