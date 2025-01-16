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
export function Mondo({ baseSize }: { baseSize: number }) {
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
