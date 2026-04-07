import { useState } from 'react';

export function useIsMiniPay() {
  // @ts-ignore
  const [isMiniPay] = useState(() => typeof window !== 'undefined' && !!window.ethereum?.isMiniPay);
  return isMiniPay;
}
