'use client';

import { DaimoPayProvider } from '@daimo/pay';
import { PropsWithChildren } from 'react';

export function DaimoPayWrapper({ children }: PropsWithChildren) {
  return (
    <DaimoPayProvider mode="light">
      {children}
    </DaimoPayProvider>
  );
}
