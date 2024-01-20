import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function SolidButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`btn btn-primary h-fit min-h-fit rounded-full border-taupe-300 px-5 py-2.5 font-semibold text-black transition-all duration-500 hover:opacity-70 disabled:text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
