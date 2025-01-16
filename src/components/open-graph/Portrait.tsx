import { Title } from './Title';

/// components

export function Portrait({ name, relativeImage }: { name: string; relativeImage: string }) {
  const baseSize = 280;
  const textSize = name.length > 12 ? 24 : name.length < 6 ? 38 : 32;
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
        src={`https://mondo.celo.org/logos/${relativeImage}`}
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
