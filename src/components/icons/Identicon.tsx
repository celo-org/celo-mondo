import jazzicon from '@metamask/jazzicon';
import Image from 'next/image';
import { CSSProperties, memo, useEffect, useState } from 'react';
import { Circle } from 'src/components/icons/Circle';
import { ONE_ADDRESS, ZERO_ADDRESS } from 'src/config/consts';
import { isValidAddress, normalizeAddress } from 'src/utils/addresses';

type Props = {
  address: string;
  size?: number;
  styles?: CSSProperties;
};

// This should match metamask: https://github.com/MetaMask/metamask-extension/blob/master/ui/helpers/utils/icon-factory.js#L84
function addressToSeed(address: string) {
  const addrStub = normalizeAddress(address).slice(2, 10);
  return parseInt(addrStub, 16);
}

function IdenticonComponent({ address, size: _size, styles }: Props) {
  const size = _size ?? 34;
  // jazzicon builds a DOM element with document APIs, so it only runs on the
  // client; the server renders an empty placeholder of the same dimensions
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container || !isValidAddress(address)) return;
    const jazziconResult = jazzicon(size, addressToSeed(address));
    container.innerHTML = '';
    container.appendChild(jazziconResult);
  }, [container, address, size]);

  if (!isValidAddress(address)) return null;

  return (
    <div className="flex w-fit items-center justify-center rounded-full border border-taupe-300">
      <div style={{ height: size, width: size, ...styles }} ref={setContainer}></div>
    </div>
  );
}

export const Identicon = memo(IdenticonComponent);

export function ImageOrIdenticon({
  imgSrc,
  address,
  size,
}: {
  imgSrc?: string;
  address: Address;
  size: number;
}) {
  return (
    <>
      {imgSrc ? (
        <Image
          src={imgSrc}
          height={size}
          width={size}
          alt=""
          className="rounded-full border border-taupe-300"
        />
      ) : !address || address === ZERO_ADDRESS || address === ONE_ADDRESS ? (
        <Circle size={size} className="bg-yellow-500" />
      ) : (
        <Identicon address={address} size={size} />
      )}
    </>
  );
}
