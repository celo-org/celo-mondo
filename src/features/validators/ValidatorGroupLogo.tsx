import { ImageOrIdenticon } from 'src/components/icons/Identicon';
import { ZERO_ADDRESS } from 'src/config/consts';
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { shortenAddress } from 'src/utils/addresses';

export function ValidatorGroupLogo({ address, size }: { address: Address; size: number }) {
  const imgSrc = VALIDATOR_GROUPS[address]?.logo;
  return <ImageOrIdenticon imgSrc={imgSrc} address={address} size={size} />;
}

export function ValidatorGroupLogoAndName({
  address,
  name,
  size = 30,
  className,
}: {
  address: Address;
  name?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <ValidatorGroupLogo address={address} size={size} />
      <div className="ml-2 flex flex-col">
        <span>
          {name || (address === ZERO_ADDRESS ? 'Default Voting Strategy' : 'Unknown Group')}
        </span>
        <span className="font-mono text-xs text-taupe-600">{shortenAddress(address)}</span>
      </div>
    </div>
  );
}
