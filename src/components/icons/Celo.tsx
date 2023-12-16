import { SVGProps, memo } from 'react';

function _CeloLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 950" {...props}>
      <path
        d="M375 850a275 275 0 1 0 0-550 275 275 0 0 0 0 550zm0 100a375 375 0 1 1 0-750 375 375 0 0 1 0 750z"
        fill="#fbcc5c"
      />
      <path
        d="M575 650a275 275 0 1 0 0-550 275 275 0 0 0 0 550zm0 100a375 375 0 1 1 0-750 375 375 0 0 1 0 750z"
        fill="#35d07f"
      />
      <path
        d="M587.4 750a274.4 274.4 0 0 0 54.5-108A274.4 274.4 0 0 0 750 587.3a373.6 373.6 0 0 1-29.2 133.4A373.6 373.6 0 0 1 587.4 750zM308 308a274.4 274.4 0 0 0-108 54.7 373.6 373.6 0 0 1 29.2-133.4A373.6 373.6 0 0 1 362.6 200a274.4 274.4 0 0 0-54.5 108z"
        fill="#5ea33b"
      />
    </svg>
  );
}
export const CeloLogo = memo(_CeloLogo);
