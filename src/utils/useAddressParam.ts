import { useState } from 'react';
import { isAddress } from 'viem';

export function useAddressParam(): Address | undefined {
  const [address] = useState(() => {
    if (typeof window === 'undefined') return undefined;
    const param = new URLSearchParams(window.location.search).get('address');
    if (param && isAddress(param)) return param as Address;
    return undefined;
  });
  return address;
}
