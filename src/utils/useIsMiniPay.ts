import { useState } from 'react';

export function useIsMiniPay() {
  const [isMiniPay] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has('minipay')) return params.get('minipay') !== 'false';
    // @ts-ignore
    return !!window.ethereum?.isMiniPay;
  });
  return isMiniPay;
}
