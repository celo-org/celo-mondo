import { ImageResponse } from 'next/og';
import React from 'react';
import { Background } from 'src/components/open-graph/Background';
import { BasePage } from 'src/components/open-graph/BasePage';
import { Mondo, MondoWithSubText } from 'src/components/open-graph/MondoLogo';
import { Portrait } from 'src/components/open-graph/Portrait';

export const runtime = 'edge';
export const alt = 'Celo Mondo';

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export async function OpenGraphImage({ children }: React.PropsWithChildren<{}>) {
  // Font loading like this seems required
  const alpina = fetch(
    new URL('../styles/alpina/GT-Alpina-Standard-Regular.ttf', import.meta.url).toString(),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>{children}</div>,
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image
      // size config to also set the ImageResponse's width and height.
      ...size,
      debug: true,
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

function FallBack() {
  return (
    <Background>
      <Mondo baseSize={100} />
    </Background>
  );
}

function Validator({ name }: { name: string }) {
  return (
    <Background direction="h">
      <MondoWithSubText baseSize={40} subText="Stake" />
      <Portrait name={name} relativeImage="/validators/" />
    </Background>
  );
}
