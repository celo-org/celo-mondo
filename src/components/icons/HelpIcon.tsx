import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useIsMobile } from 'src/styles/mediaQueries';
import Icon from '../../images/icons/info-circle.svg';
import { IconButton } from '../buttons/IconButton';

type HelpIconProps = {
  type?: 'tooltip' | 'button';
  text: string;
  size?: number;
  align?: 'center' | 'right';
  position?: 'above' | 'below';
};

export function HelpIcon({
  text,
  size = 12,
  type = 'button',
  align = 'center',
  position = 'below',
}: HelpIconProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    type = 'button';
  }
  const onClick = useCallback(() => {
    toast.info(text, { autoClose: 8000 });
  }, [text]);

  return (
    <div className="group relative flex">
      <IconButton
        imgSrc={Icon}
        title={type === 'button' ? 'Help' : undefined}
        width={size}
        height={size}
        onClick={type === 'button' ? onClick : undefined}
      />
      {type === 'tooltip' && (
        <span
          className={`pointer-events-none absolute z-50 w-64 rounded-[2px] bg-accent px-3 py-3 text-sm leading-relaxed text-gray-100 opacity-0 transition-opacity group-hover:opacity-100 ${
            position === 'above' ? 'bottom-full mb-2' : 'translate-y-8'
          } ${align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
        >
          {text}
          <span
            className={`absolute border-8 border-transparent ${
              position === 'above' ? 'top-full border-t-accent' : 'bottom-full border-b-accent'
            } ${align === 'right' ? 'right-1' : 'left-[50%] ml-[-8px]'}`}
          />
        </span>
      )}
    </div>
  );
}
