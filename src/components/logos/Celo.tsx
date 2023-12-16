import { SVGProps, memo } from 'react';
import { Color } from 'src/styles/Color';

function _CeloGlyph(props: SVGProps<SVGSVGElement>) {
  const { fill, ...rest } = props;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 383" {...rest}>
      <path
        d="M383.5,0H0.5v383h383V249.3h-63.6C298,298.1,248.7,332,192.3,332c-77.8,0-140.8-63.6-140.8-140.8 C51.4,114,114.5,51,192.3,51C249.8,51,299.1,86,321,135.9h62.5V0z"
        fill={fill || Color.Purple}
      />
    </svg>
  );
}
export const CeloGlyph = memo(_CeloGlyph);

function _CeloLogo(props: SVGProps<SVGSVGElement>) {
  const { fill, ...rest } = props;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 968 219" fill="none" {...rest}>
      <g>
        <path
          d="M858.1,189.8c44.4,0,80-35.9,80-80.3c0-44.4-35.6-80-80-80c-44.4,0-80,35.9-80,80C778.2,153.5,814.1,189.8,858.1,189.8z M749.1,0.4h218.4v218.4H749.1V0.4z"
          fill={fill || Color.Purple}
        />
        <path
          d="M430.3,142.6c-12.8,27.8-40.6,47.2-73.1,47.2c-43.1,0-78.4-34.4-80-77.2h189.3V0.4H248.2v218.4h218.4v-76.2 H430.3z M280.7,85.7h152.5c-11.2-37.2-41.2-56.2-75.9-56.2S290.3,49.8,280.7,85.7L280.7,85.7z"
          fillRule="evenodd"
          clipRule="evenodd"
          fill={fill || Color.Purple}
        />
        <path
          d="M218.8,0.4H0.4v218.4h218.4v-76.2h-36.2c-12.5,27.8-40.6,47.2-72.8,47.2c-44.4,0-80.3-36.2-80.3-80.3 c0-44.1,35.9-80,80.3-80c32.8,0,60.9,20,73.4,48.4h35.6V0.4z"
          fill={fill || Color.Purple}
        />
        <path
          d="M721.8,142.6h-36.2v0c-10.9,28.7-40.3,46.9-73.7,46.9c-43.1,0-79.4-31.2-79.4-80V0.4h-36.9v218.4h226.2V142.6z"
          fill={fill || Color.Purple}
        />
      </g>
    </svg>
  );
}
export const CeloLogo = memo(_CeloLogo);
