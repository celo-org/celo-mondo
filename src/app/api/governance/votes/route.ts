import { type NextRequest } from 'next/server';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

// Ensure this route is never statically cached
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const chainId = Number(request.nextUrl.searchParams.get('chainId')) || celoPublicClient.chain.id;

  return Response.json(await getProposalVotes(chainId), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
