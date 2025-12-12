import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function SolidButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`btn h-fit min-h-fit rounded-full border-taupe-300 px-5 py-2.5 font-semibold transition-all duration-500 disabled:bg-gray-300 disabled:text-gray-800 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
