import Image from 'next/image';

export function MondoWithSubText({ baseSize, subText }: { baseSize: number; subText: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        position: 'relative',
        flexDirection: 'column',
      }}
    >
      <Mondo baseSize={baseSize} />
      <div
        style={{
          marginTop: baseSize * 0.4,
          display: 'flex',
          fontSize: baseSize * 1.7,
          fontWeight: 200,
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {subText}
      </div>
    </div>
  );
}
export function Mondo({ baseSize }: { baseSize: number }) {
  const size = baseSize * 1.2;
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
          fontSize: size * 1,
          display: 'flex',
          textAlign: 'center',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: size * 0.3,
        }}
      >
        <Image
          src={'https://mondo.celo.org/logos/celo-full.svg'}
          width={size * 4}
          height={size}
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
