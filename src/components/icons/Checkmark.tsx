import { memo } from 'react';

function _Checkmark({
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
      viewBox="0 0 36 27"
    >
      <path
        fill={fill}
        d="M32.22 0 12.45 19.77l-7.03-5.62-2.08-1.67L0 16.65l10.98 8.79 1.86 1.47L34.11 5.64 36 3.78 32.22 0Z"
      />
    </svg>
  );
}

export const Checkmark = memo(_Checkmark);
