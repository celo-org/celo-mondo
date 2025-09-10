import { ImageResponse } from 'next/og';
import React from 'react';
import { Background } from 'src/components/open-graph/Background';
import { BasePage } from 'src/components/open-graph/BasePage';
import { Mondo } from 'src/components/open-graph/MondoLogo';

export const runtime = 'edge';
export const alt = 'Celo Mondo';

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// NOTE: using readFile here fails because somehow webpack _realllly_
// wants to bundle this file and `path`/`fs` both aren't importable
const alpina = fetch(
  new URL(
    'https://github.com/celo-org/celo-mondo/raw/8db2b2c80bf3f4f6e26b2f060ec2846d40ea5e5f/public/fonts/alpina-standard-regular.ttf',
  ).toString(),
).then((res) => res.arrayBuffer());

// Image generation
export async function OpenGraphImage({ children }: React.PropsWithChildren<{}>) {
  return new ImageResponse(
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>{children}</div>,
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image
      // size config to also set the ImageResponse's width and height.
      ...size,
      // debug: true,
      fonts: [
        {
          name: 'Alpina',
          data: await alpina,
          style: 'normal',
          weight: 400,
        },
      ],
    },
  );
}

export default function Image() {
  return OpenGraphImage({ children: <BasePage title="Staking" /> });
}

export function FallBack() {
  return (
    <Background>
      <Mondo baseSize={100} />
    </Background>
  );
}
