import { shortenAddress } from 'src/utils/addresses';
import { CELONAMES_SUFFIX, useAddressToLabel } from 'src/utils/useAddressToLabel';

interface Props {
  address: Address | undefined;
  shortener?: (address: Address) => string;
  className?: string;
  hiddenIfNoLabel?: boolean;
}
export default function AddressLabel({
  address,
  shortener = shortenAddress,
  className,
  hiddenIfNoLabel,
}: Props) {
  const fn = useAddressToLabel(shortener);

  if (!address) {
    return null;
  }

  const { label, fallback, isCeloName } = fn(address);
  if (!label && hiddenIfNoLabel) {
    return null;
  }

  return (
    <span className={className}>
      {label ? (
        isCeloName ? (
          <span>
            {label.slice(0, -CELONAMES_SUFFIX.length)}
            <span className="font-semibold text-black">{CELONAMES_SUFFIX}</span>
          </span>
        ) : (
          label
        )
      ) : (
        fallback
      )}
    </span>
  );
}
