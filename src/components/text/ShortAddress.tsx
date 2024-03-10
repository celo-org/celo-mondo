import { ButtonHTMLAttributes } from 'react';
import { shortenAddress } from 'src/utils/addresses';
import { useCopyHandler } from 'src/utils/clipboard';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  address: Address;
};

export function ShortAddress({ address, ...props }: Props) {
  const onClick = useCopyHandler(address);
  return (
    <button type="button" onClick={onClick} title="Copy address" {...props}>
      {shortenAddress(address)}
    </button>
  );
}
