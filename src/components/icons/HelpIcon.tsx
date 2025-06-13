import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useIsMobile } from 'src/styles/mediaQueries';
import Icon from '../../images/icons/info-circle.svg';
import { IconButton } from '../buttons/IconButton';

type HelpIconProps = {
  type?: 'tooltip' | 'button';
  text: string;
  size?: number;
};

export function HelpIcon({ text, size = 12, type = 'button' }: HelpIconProps) {
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
        <span className="absolute left-1/2 mx-auto min-w-max -translate-x-1/2 translate-y-8 rounded-[2px] bg-purple-500 px-2 py-4 text-sm text-gray-100 opacity-0 transition-opacity group-hover:opacity-100">
          {text}
          <span className="absolute bottom-[100%] left-[50%] ml-[-8px] border-[8px] border-transparent border-b-purple-500" />
        </span>
      )}
    </div>
  );
}
