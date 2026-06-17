/* eslint-disable no-console */
import { revalidateTag } from 'next/cache';
import { type NextRequest } from 'next/server';
import { CacheKeys } from 'src/config/consts';
import { getProposals } from 'src/features/governance/getProposals';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

// Ensure this route is never statically cached
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const chainId = Number(request.nextUrl.searchParams.get('chainId')) || celoPublicClient.chain.id;

  return Response.json(await getProposals(chainId), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function DELETE(): Promise<Response> {
  revalidateTag(CacheKeys.AllProposals);
  return new Response(null, { status: 204 });
}
