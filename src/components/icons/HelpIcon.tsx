import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useIsMobile } from 'src/styles/mediaQueries';

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
      <button
        type="button"
        title={type === 'button' ? 'Help' : undefined}
        className="flex items-center justify-center transition-all hover:opacity-70"
        onClick={type === 'button' ? onClick : undefined}
      >
        <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
          <path d="M6.75 5.25H5.25V9H6.75V5.25ZM6.75 3H5.25V4.5H6.75V3Z" fill="currentColor" />
        </svg>
      </button>
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
