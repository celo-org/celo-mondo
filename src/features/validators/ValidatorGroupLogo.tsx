import Image from 'next/image';
import { Identicon } from 'src/components/icons/Identicon';
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
      ) : (
        <Identicon address={address} size={size} />
      )}
    </>
  );
}
