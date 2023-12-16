import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function SolidButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`border-taupe-300 btn rounded-full bg-yellow-500 font-semibold text-black hover:bg-yellow-500 hover:opacity-90 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
