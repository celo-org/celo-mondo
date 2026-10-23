import { type NextRequest } from 'next/server';
import { fetchParticipation } from 'src/features/delegation/fetchParticipation';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const chainId = Number(request.nextUrl.searchParams.get('chainId')) || celoPublicClient.chain.id;

  return Response.json(await fetchParticipation(chainId), {
    headers: {
      // Votes reach the DB through webhooks and an hourly backfill; a few minutes of
      // edge caching keeps every delegate page refetch from hitting it
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
