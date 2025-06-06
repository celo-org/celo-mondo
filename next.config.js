/** @type {import('next').NextConfig} */

import { readFileSync } from 'node:fs';

const isDev = process.env.NODE_ENV !== 'production';

// Sometimes useful to disable this during development
const ENABLE_CSP_HEADER = true;
const CONNECT_SRC_HOSTS = [
  'https://*.celo.org',
  'https://*.celo-testnet.org',
  'https://*.celoscan.io',
  'https://*.walletconnect.com',
  'wss://*.walletconnect.com',
  'wss://*.walletconnect.org',
  'https://api.github.com',
  'https://raw.githubusercontent.com',
  'https://celo-mainnet.infura.io',
  'https://qstash.upstash.io',
  'https://app.safe.global',
  'https://pass.celopg.eco',
  'https://*.rainbow.me',
];
const FRAME_SRC_HOSTS = [
  'https://*.walletconnect.com',
  'https://*.walletconnect.org',
  'https://app.safe.global',
  'https://pass.celopg.eco',
];
const IMG_SRC_HOSTS = [
  'https://*.walletconnect.com',
  'https://app.safe.global',
  'https://pass.celopg.eco',
];
const SCRIPTS_SRC_HOSTS = ['https://*.safe.global'];

const cspHeader = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval'" : SCRIPTS_SRC_HOSTS.join(' ')};
  script-src-elem 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' ${CONNECT_SRC_HOSTS.join(' ')};
  img-src 'self' blob: data: ${IMG_SRC_HOSTS.join(' ')};
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-src 'self' ${FRAME_SRC_HOSTS.join(' ')};
  frame-ancestors 'self' ${FRAME_SRC_HOSTS.join(' ')};
  ${!isDev ? 'block-all-mixed-content;' : ''}
  ${!isDev ? 'upgrade-insecure-requests;' : ''}
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: `ALLOW-FROM ${FRAME_SRC_HOSTS.join(' ')}`,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  ...(ENABLE_CSP_HEADER
    ? [
        {
          key: 'Content-Security-Policy',
          value: cspHeader,
        },
      ]
    : []),
];

export default {
  webpack: (config, { isServer }) => {
    config.externals = [...config.externals, 'pino-pretty'];
    if (isServer && process.env.NODE_ENV === 'production') {
      config.devtool = 'source-map';
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // This allow the manifest to be fetched and used by safe.global
        source: '/manifest.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, content-type, Authorization',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: IMG_SRC_HOSTS.map((h) => ({
      protocol: 'https',
      hostname: h,
    })),
  },

  env: {
    NEXT_PUBLIC_VERSION: JSON.parse(readFileSync('./package.json').toString('utf-8')).version,
  },
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
};
