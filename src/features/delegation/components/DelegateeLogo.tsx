import { ImageOrIdenticon } from 'src/components/icons/Identicon';
import { getDelegateeMetadata } from 'src/features/delegation/delegateeMetadata';
import { shortenAddress } from 'src/utils/addresses';

export function DelegateeLogo({ address, size }: { address: Address; size: number }) {
  const metadata = getDelegateeMetadata();
  const imgSrc = metadata[address]?.logoUri;
  return <ImageOrIdenticon imgSrc={imgSrc} address={address} size={size} />;
}

export function DelegateeLogoAndName({
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
      <DelegateeLogo address={address} size={size} />
      <div className="ml-2 flex flex-col">
        <span>{name || 'Unknown Delegate'}</span>
        <span className="font-mono text-xs text-taupe-600">{shortenAddress(address)}</span>
      </div>
    </div>
  );
}
