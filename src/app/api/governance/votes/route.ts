import { StaleTime } from 'src/config/consts';
import { getCachedVotes } from 'src/features/governance/getProposalVotes';
import { celoPublicClient } from 'src/utils/client';

export async function GET(): Promise<Response> {
  const headers = new Headers();
  headers.append(
    'Cache-Control',
    `public,max-age=${StaleTime.Short / 1000}, stale-while-revalidate`,
  );

  return Response.json(await getCachedVotes(celoPublicClient.chain.id), {
    headers,
  });
}
