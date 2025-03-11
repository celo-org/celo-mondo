import { OFAC_SANCTIONS_LIST_URL, SANCTIONED_ADDRESSES } from '@celo/compliance';
import { PropsWithChildren, useEffect } from 'react';
import { DAY } from 'src/config/consts';
import { readFromCache, writeToCache } from 'src/utils/localSave';
import { useAccount, useDisconnect } from 'wagmi';

export function LegalRestrict(props: PropsWithChildren) {
  usePolice();
  return props.children;
}

function usePolice() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address) {
      isSanctionedAddress(address).then((isSanctioned) => {
        if (isSanctioned) {
          disconnect();
          alert('The Address is under OFAC Sanctions');
        }
      });
      fetch('/police').then((response) => {
        if (response.status === 451) {
          disconnect();
          alert('The Region is under Sanction');
        }
      });
    }
  }, [isConnected, address, disconnect]);
}

export async function isSanctionedAddress(address: string): Promise<boolean> {
  const cache = readFromCache(OFAC_SANCTIONS_LIST_URL);
  if (cache && cache.ts + DAY > Date.now()) {
    return cache.data.includes(address.toLowerCase());
  }

  const sanctionedAddresses: string[] = await fetch(OFAC_SANCTIONS_LIST_URL)
    .then((x) => x.json())
    .catch(() => SANCTIONED_ADDRESSES); // fallback if github is down or something.

  if (process.env.NODE_ENV !== 'production' && process.env.TEST_SANCTIONED_ADDRESS) {
    sanctionedAddresses.push(process.env.TEST_SANCTIONED_ADDRESS);
  }

  writeToCache(
    OFAC_SANCTIONS_LIST_URL,
    sanctionedAddresses.map((x) => x.toLowerCase()),
  );

  return isSanctionedAddress(address);
}
