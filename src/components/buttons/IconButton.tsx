import Image from 'next/image';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  width?: number;
  height?: number;
  imgSrc?: string;
};

export function IconButton(props: Props) {
  const { width, height, className, imgSrc, children, ...rest } = props;

  const base = 'flex items-center justify-center transition-all';
  const onHover = 'hover:opacity-70';
  const onDisabled = 'disabled:opacity-30 disabled:cursor-default';
  const onActive = 'active:opacity-60';
  const allClasses = `${base} ${onHover} ${onDisabled} ${onActive} ${className}`;

  return (
    <button type="button" className={allClasses} {...rest}>
      {imgSrc && <Image src={imgSrc} alt={rest.title || ''} width={width} height={height} />}
      {children}
    </button>
  );
}
