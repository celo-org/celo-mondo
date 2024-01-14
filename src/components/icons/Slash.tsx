import { memo } from 'react';

function _SlashIcon({
  width,
  height,
  fill,
  className = '',
}: {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
      viewBox="0 0 10 12"
    >
      <path
        fill={fill || '#000'}
        d="m7.8 2 .6-1-.8-.5L7 1.6c-.6-.3-1.3-.4-2-.4a4.8 4.8 0 0 0-2.8 8.7l-.6 1 .8.6.6-1.1c.6.3 1.3.4 2 .4a4.8 4.8 0 0 0 2.8-8.7ZM1.1 6a3.9 3.9 0 0 1 5.4-3.6L2.7 9.1C1.7 8.4 1 7.3 1 6ZM5 9.9a4 4 0 0 1-1.5-.3l3.8-6.7A3.9 3.9 0 0 1 5 10Z"
      />
    </svg>
  );
}

export const SlashIcon = memo(_SlashIcon);
