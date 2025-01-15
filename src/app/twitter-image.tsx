import { ImageResponse } from 'next/og';
import { Color } from 'src/styles/Color';

export const runtime = 'edge';

// Image metadata
export const alt = 'Celo Mondo';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  // Font
  const alpina = fetch(
    new URL('../styles/alpina/GT-Alpina-Standard-Regular.ttf', import.meta.url).toString(),
  ).then((res) => res.arrayBuffer());

  // Image
  // const celoLogo = fetch(
  //   new URL('../../public/logos/celo-full.png', import.meta.url).toString(),
  // ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 128,
          background: Color.Sand,
          color: Color.Black,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <img
            src={'https://mondo.celo.org/logos/celo-full.svg'}
            width={400}
            height={170}
            alt="Celo Mondo"
            style={{
              objectFit: 'contain',
            }}
          />
          {'Staking'}
        </div>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image
      // size config to also set the ImageResponse's width and height.
      ...size,
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
