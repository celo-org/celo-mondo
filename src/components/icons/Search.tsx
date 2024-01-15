import { memo } from 'react';

function _Search({
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
      viewBox="0 0 16 16"
    >
      <path
        fill={fill}
        d="M6.7 13.4c1.5 0 3-.5 4.2-1.5l4 4.1 1.1-1.1-4-4a6.7 6.7 0 1 0-5.3 2.5Zm0-11.9a5.1 5.1 0 1 1 0 10.3 5.1 5.1 0 0 1 0-10.3Z"
      />
    </svg>
  );
}

export const Search = memo(_Search);
