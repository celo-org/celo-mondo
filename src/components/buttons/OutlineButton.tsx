import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function OutlineButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`border-taupe-300 btn btn-outline h-fit min-h-fit rounded-full px-4 py-2.5 font-semibold text-black hover:bg-black/5 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
