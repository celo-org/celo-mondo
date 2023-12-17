import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function SolidButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`btn h-fit min-h-fit rounded-full border-taupe-300 bg-yellow-500 px-5 py-2.5 font-semibold text-black hover:bg-yellow-500 hover:opacity-90 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
