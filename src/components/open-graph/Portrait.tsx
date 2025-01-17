/* eslint-disable @next/next/no-img-element */
import { shortenAddress } from 'src/utils/addresses';
import { Title } from './Title';

/// components

export function Portrait({
  name,
  relativeImage,
  address,
}: {
  name: string;
  relativeImage: string;
  address: Address;
}) {
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
      {relativeImage?.length ? (
        <img
          src={`https://mondo.celo.org${relativeImage}`}
          width={baseSize}
          height={baseSize}
          alt="CELO"
          style={{
            border: '1px solid #C6C2B5',
            objectFit: 'contain',
            margin: 30,
          }}
        />
      ) : (
        <Title baseSize={baseSize / 3} text="🌐" />
      )}
      <Title baseSize={textSize} text={name.length ? name : shortenAddress(address)} />
    </div>
  );
}
