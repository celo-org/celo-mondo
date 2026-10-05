import { useEffect, useState } from 'react';

export function useIsMiniPay() {
  // Detected in an effect so server and first client render agree (no hydration mismatch)
  const [isMiniPay, setIsMiniPay] = useState(false);
  useEffect(() => {
    // @ts-ignore window.ethereum is injected by the MiniPay wallet
    setIsMiniPay(!!window.ethereum?.isMiniPay);
  }, []);
  return isMiniPay;
}
