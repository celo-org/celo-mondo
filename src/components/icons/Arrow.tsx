import { SVGProps, memo } from 'react';
import { Color } from 'src/styles/Color';

type Props = SVGProps<SVGSVGElement> & {
  direction: 'n' | 'e' | 's' | 'w';
};

function _ArrowIcon({ fill, className, direction, ...rest }: Props) {
  let directionClass;
  switch (direction) {
    case 'n':
      directionClass = 'rotate-90';
      break;
    case 'e':
      directionClass = 'rotate-180';
      break;
    case 's':
      directionClass = '-rotate-90';
      break;
    case 'w':
      directionClass = '';
      break;
    default:
      throw new Error(`Invalid direction ${direction}`);
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${directionClass} ${className}`}
      {...rest}
    >
      <path
        fillRule="evenodd"
        d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5"
        fill={fill || Color.Black}
      />
    </svg>
  );
}

export const ArrowIcon = memo(_ArrowIcon);
