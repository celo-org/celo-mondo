import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  // const nonceRule = `'nonce-${nonce}'`;
  // Note, causes a problem for firefox: https://github.com/MetaMask/metamask-extension/issues/3133
  const cspHeader = `
    default-src 'self';
    script-src 'self' ${isDev ? "'unsafe-eval' 'unsafe-inline'" : ''};
    connect-src 'self' ${CONNECT_SRC_HOSTS.join(' ')};
    style-src 'self' ${isDev ? "'unsafe-inline'" : ''};
    img-src 'self' blob: data: ${IMG_SRC_HOSTS.join(' ')};
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src 'self' ${FRAME_SRC_HOSTS.join(' ')};
    frame-ancestors 'none';
    ${!isDev ? 'block-all-mixed-content;' : ''}
    ${!isDev ? 'upgrade-insecure-requests;' : ''}
`;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    headers: requestHeaders,
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

  return response;
}

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon (favicon files)
//      */
//     {
//       source: '/((?!api|_next/image|_next/static|favicon).*)',
//       missing: [
//         { type: 'header', key: 'next-router-prefetch' },
//         { type: 'header', key: 'purpose', value: 'prefetch' },
//       ],
//     },
//   ],
// };
