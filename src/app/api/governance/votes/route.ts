import { GCTime, StaleTime } from 'src/config/consts';
import { getCachedVotes } from 'src/features/governance/getProposalVotes';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

export async function GET(): Promise<Response> {
  const headers = new Headers();
  headers.append(
    'Cache-Control',
    `public,max-age=${GCTime.Short / 1000}, stale-while-revalidate=${StaleTime.Short / 1000}`,
  );

  return Response.json(await getCachedVotes(celoPublicClient.chain.id), {
    headers,
  });
}
