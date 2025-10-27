import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function SolidButton({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  if (!className?.includes('bg-')) {
    className += ' bg-primary text-primary-content';
  }
  return (
    <button
      className={`btn border-taupe-300 h-fit min-h-fit rounded-full px-5 py-2.5 font-semibold transition-all duration-500 disabled:bg-gray-300 disabled:text-gray-800 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
