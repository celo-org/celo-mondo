import { NextRequest, NextResponse } from 'next/server';

const DAIMO_PAY_API = 'https://pay-api.daimo.xyz';

/**
 * Proxy for Daimo Pay API to handle CORS issues in development.
 * This forwards all requests to the Daimo Pay API and returns the response.
 */
async function proxyRequest(request: NextRequest, method: 'GET' | 'POST') {
  try {
    // Extract the path after /api/daimo-pay/
    const url = new URL(request.url);
    const pathAfterProxy = url.pathname.replace('/api/daimo-pay/', '');
    const targetUrl = `${DAIMO_PAY_API}/${pathAfterProxy}${url.search}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    if (method === 'POST') {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Daimo Pay proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
