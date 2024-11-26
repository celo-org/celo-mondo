import { ButtonHTMLAttributes } from 'react';
import { CopyInline } from 'src/components/text/CopyInline';
import { shortenAddress } from 'src/utils/addresses';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  address: Address;
};

export function ShortAddress({ address, ...props }: Props) {
  return <CopyInline text={shortenAddress(address)} title="Copy address" {...props} />;
}
