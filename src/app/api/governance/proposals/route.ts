import { revalidateTag } from 'next/cache';
import { CacheKeys } from 'src/config/consts';
import { getProposals } from 'src/features/governance/getProposals';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

export async function GET(): Promise<Response> {
  return Response.json(await getProposals(celoPublicClient.chain.id), {
    headers: {
      // https://vercel.com/docs/headers/cache-control-headers#using-private
      // No vercel CDN caching but allow browser(client) caching
      'Cache-Control': `private, max-age=${0}, must-revalidate`,
    },
  });
}

export async function DELETE(): Promise<Response> {
  revalidateTag(CacheKeys.AllProposals);
  console.info('Invalidated cache for proposals');
  return new Response(null, { status: 204 });
}
