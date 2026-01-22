'use client';

import { DaimoPayProvider } from '@daimo/pay';
import { PropsWithChildren } from 'react';

// In development, use our proxy to avoid CORS issues
// In production, use the direct Daimo Pay API
const isDev = process.env.NODE_ENV !== 'production';
const payApiUrl = isDev ? '/api/daimo-pay/' : 'https://pay-api.daimo.xyz/';

export function DaimoPayWrapper({ children }: PropsWithChildren) {
  return (
    <DaimoPayProvider mode="light" payApiUrl={payApiUrl}>
      {children}
    </DaimoPayProvider>
  );
}
