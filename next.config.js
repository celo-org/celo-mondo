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
  {
    // Note: This is a fallback default CSP.
    // See middleware.ts for the actual CSP
    key: 'Content-Security-Policy',
    value: `default-src 'self';`,
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
