import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

const alpina = readFile(join(process.cwd(), 'public/fonts/alpina-standard-regular.ttf'));

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
