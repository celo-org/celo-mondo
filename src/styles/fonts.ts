import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const interFont = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const alpinaFont = localFont({
  src: [
    {
      path: './alpina/GT-Alpina-Standard-Thin.woff2',
      weight: '300',
    },
    {
      path: './alpina/GT-Alpina-Standard-Light.woff2',
      weight: '400',
    },
    {
      path: './alpina/GT-Alpina-Standard-Regular.woff2',
      weight: '500',
    },
  ],
  variable: '--font-alpina',
});
