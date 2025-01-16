import { ImageResponse } from 'next/og';
import { CSSProperties } from 'react';
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
  // Font loading like this seems required
  const alpina = fetch(
    new URL('../styles/alpina/GT-Alpina-Standard-Regular.ttf', import.meta.url).toString(),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <Validator name="Ledger By Figment" />,
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
        {
          name: 'Alpina',
          data: await alpina,
          style: 'normal',
          weight: 200,
        },
      ],
    },
  );
}

function FallBack() {
  return (
    <Background>
      <Mondo baseSize={100} />
    </Background>
  );
}

// function BasePage({ title }: { title: string }) {
//   return (
//     <Background>
//       <Mondo baseSize={80} />
//       <Title baseSize={80} text={title} />
//     </Background>
//   );
// }

function Validator({ name }: { name: string }) {
  return (
    <Background direction="h">
      <MondoWithSubText baseSize={40} subText="Stake" />
      <Portrait name={name} />
    </Background>
  );
}

/// components

function Portrait({ name }: { name: string }) {
  const baseSize = 280;
  const textSize = name.length > 12 ? 24 : 32;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: name.length > 12 ? 0 : 30,
      }}
    >
      <img
        src={'https://mondo.celo.org/logos/validators/a16z.jpg'}
        width={baseSize * 1}
        height={baseSize * 1}
        alt="CELO"
        style={{
          objectFit: 'contain',
          margin: 30,
        }}
      />
      <Title baseSize={textSize} text={name} />
    </div>
  );
}

function Title({ baseSize, text }: { baseSize: number; text: string }) {
  return (
    <div
      style={{
        marginTop: baseSize * 0.3,
        fontSize: baseSize * 2.25,
        color: Color.Black,
        display: 'flex',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

function Background({
  children,
  direction = 'v',
}: {
  children: React.ReactNode;
  direction?: 'h' | 'v';
}) {
  const style: CSSProperties =
    direction === 'v'
      ? {
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }
      : {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
        };
  return (
    <div
      style={{
        color: Color.Black,
        background: Color.Sand,
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MondoWithSubText({ baseSize, subText }: { baseSize: number; subText: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexDirection: 'column',
      }}
    >
      <Mondo baseSize={baseSize} />
      <div
        style={{
          marginTop: baseSize * 0.4,
          display: 'flex',
          fontSize: baseSize * 1.5,
          fontWeight: 200,
          fontFamily: 'sans-serif',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {subText}
      </div>
    </div>
  );
}

function Mondo({ baseSize }: { baseSize: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontSize: baseSize * 1.5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        <img
          src={'https://mondo.celo.org/logos/celo-full.svg'}
          width={baseSize * 4}
          height={baseSize}
          alt="CELO"
          style={{
            objectFit: 'contain',
          }}
        />
        {'MONDO'}
      </div>
    </div>
  );
}
