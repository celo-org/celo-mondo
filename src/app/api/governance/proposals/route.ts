import { revalidateTag } from 'next/cache';
import { CacheKeys, GCTime, StaleTime } from 'src/config/consts';
import { getCachedProposals } from 'src/features/governance/getProposals';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

export async function GET(): Promise<Response> {
  const headers = new Headers();
  headers.append(
    'Cache-Control',
    `public,max-age=${GCTime.Default / 1000}, stale-while-revalidate=${StaleTime.Default / 1000}`,
  );

  return Response.json(await getCachedProposals(celoPublicClient.chain.id), {
    headers,
  });
}

export async function DELETE(): Promise<Response> {
  revalidateTag(CacheKeys.AllProposals);
  console.info('Invalidated cache for proposals');
  return new Response(null, { status: 204 });
}
