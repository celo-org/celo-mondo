import { StaleTime } from 'src/config/consts';
import { getCachedProposals } from 'src/features/governance/getProposals';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

export async function GET(): Promise<Response> {
  const headers = new Headers();
  headers.append(
    'Cache-Control',
    `public,max-age=${StaleTime.Long / 1000}, stale-while-revalidate`,
  );

  return Response.json(await getCachedProposals(celoPublicClient.chain.id), {
    headers,
  });
}
