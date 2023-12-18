import { SVGProps, memo } from 'react';
import { Color } from 'src/styles/Color';

type Props = SVGProps<SVGSVGElement> & {
  direction: 'n' | 'e' | 's' | 'w';
};

function _ChevronIcon({ fill, className, direction, ...rest }: Props) {
  let directionClass;
  switch (direction) {
    case 'n':
      directionClass = '-rotate-90';
      break;
    case 'e':
      directionClass = '';
      break;
    case 's':
      directionClass = 'rotate-90';
      break;
    case 'w':
      directionClass = 'rotate-180';
      break;
    default:
      throw new Error(`Invalid chevron direction ${direction}`);
  }

  return (
    <svg
      width="4"
      height="6"
      viewBox="0 0 4 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${directionClass} ${className}`}
      {...rest}
    >
      <path
        d="M1 0.5L3.5 3L1 5.5"
        stroke={fill || Color.Black}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export const ChevronIcon = memo(_ChevronIcon);
