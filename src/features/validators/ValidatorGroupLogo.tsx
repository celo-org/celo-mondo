import Image from 'next/image';
import { Circle } from 'src/components/icons/Circle';
import { Identicon } from 'src/components/icons/Identicon';
import { ZERO_ADDRESS } from 'src/config/consts';
import { VALIDATOR_GROUPS } from 'src/config/validators';

export function ValidatorGroupLogo({ address, size }: { address: Address; size: number }) {
  return (
    <>
      {VALIDATOR_GROUPS[address] ? (
        <Image
          src={VALIDATOR_GROUPS[address].logo}
          height={size}
          width={size}
          alt=""
          className="rounded-full border border-taupe-300 p-px"
        />
      ) : !address || address === ZERO_ADDRESS ? (
        <Circle size={size} className="bg-purple-500" />
      ) : (
        <Identicon address={address} size={size} />
      )}
    </>
  );
}
