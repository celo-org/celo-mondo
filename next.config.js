/** @type {import('next').NextConfig} */

const { version } = require('./package.json')

const isDev = process.env.NODE_ENV !== 'production'

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
  // Note, causes a problem for firefox: https://github.com/MetaMask/metamask-extension/issues/3133
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; script-src 'self'${
      isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''
    }; connect-src 'self' https://*.celo.org https://*.celo-testnet.org https://*.walletconnect.com wss://walletconnect.celo.org wss://*.walletconnect.com wss://*.walletconnect.org https://raw.githubusercontent.com; img-src 'self' data: https://raw.githubusercontent.com https://*.walletconnect.com; style-src 'self' 'unsafe-inline' https://*.googleapis.com; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org;`,
  },
]

module.exports = {
  webpack: (config) => {
    config.externals = [...config.externals, 'pino-pretty']
    return config
  },

  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ]
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
