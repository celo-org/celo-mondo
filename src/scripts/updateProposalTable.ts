import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function main() {
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  await updateProposalsInDB(client, undefined, 'replay');
  process.exit(0);
}

main();
