/** @type {import('next').NextConfig} */

const { version } = require('./package.json')

const isDev = process.env.NODE_ENV !== 'production'

const CONNECT_SRC_HOSTS = [
  'https://*.celo.org',
  'https://*.celoscan.io',
  'https://*.walletconnect.com',
  'wss://*.walletconnect.com',
  'wss://*.walletconnect.org',
  'https://raw.githubusercontent.com',
  'https://celo-mainnet.infura.io',
];
const FRAME_SRC_HOSTS = ['https://*.walletconnect.com', 'https://*.walletconnect.org'];
const IMG_SRC_HOSTS = ['https://raw.githubusercontent.com', 'https://*.walletconnect.com'];

const cspHeader = `
  default-src 'self';
  script-src 'self'${isDev ? " 'unsafe-eval'" : ''};
  script-src-elem 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' ${CONNECT_SRC_HOSTS.join(' ')};
  img-src 'self' blob: data: ${IMG_SRC_HOSTS.join(' ')};
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-src 'self' ${FRAME_SRC_HOSTS.join(' ')};
  frame-ancestors 'none';
  ${!isDev ? 'block-all-mixed-content;' : ''}
  ${!isDev ? 'upgrade-insecure-requests;' : ''}
`.replace(/\s{2,}/g, ' ').trim()

const securityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
]

module.exports = {
  webpack: (config) => {
    config.externals = [...config.externals, 'pino-pretty']
    return config
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  env: {
    NEXT_PUBLIC_VERSION: version,
  },

  reactStrictMode: true,
}
