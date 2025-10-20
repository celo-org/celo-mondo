import { GCTime } from 'src/config/consts';
import { getProposalVotes } from 'src/features/governance/getProposalVotes';
import { celoPublicClient } from 'src/utils/client';
import 'src/vendor/polyfill';

export async function GET(): Promise<Response> {
  return Response.json(await getProposalVotes(celoPublicClient.chain.id), {
    headers: {
      // https://vercel.com/docs/headers/cache-control-headers#using-private
      // No vercel CDN caching but allow browser(client) caching
      'Cache-Control': `private, max-age=${GCTime.Short / 1000}, must-revalidate`,
    },
  });
}
