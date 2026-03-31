import { useEffect, useState } from 'react';

export function useIsMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    // @ts-ignore
    setIsMiniPay(typeof window !== 'undefined' && !!window.ethereum?.isMiniPay);
  }, []);

  return isMiniPay;
}
