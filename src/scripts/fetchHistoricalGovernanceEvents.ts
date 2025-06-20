import fetchHistoricalEvents from 'src/features/governance/fetchHistoricalGovernanceEvents';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

async function main() {
  let fromBlock: bigint | undefined;

  if (process.env.RESUME_FROM_BLOCK) {
    fromBlock = BigInt(process.env.RESUME_FROM_BLOCK);
  }
  const archiveNode = process.env.PRIVATE_NO_RATE_LIMITED_NODE!;

  const client = createPublicClient({
    chain: celo,
    transport: http(archiveNode, {
      batch: true,
      timeout: 30_000, // half a min
    }),
  }) as PublicClient<Transport, Chain>;

  await fetchHistoricalEvents('ProposalQueued', client, fromBlock);
  await fetchHistoricalEvents('ProposalDequeued', client, fromBlock);
  await fetchHistoricalEvents('ProposalApproved', client, fromBlock);
  await fetchHistoricalEvents('ProposalExecuted', client, fromBlock);
  await fetchHistoricalEvents('ProposalVoted', client, fromBlock);
  await fetchHistoricalEvents('ProposalVoteRevoked', client, fromBlock);
  await fetchHistoricalEvents('ProposalVotedV2', client, fromBlock);
  await fetchHistoricalEvents('ProposalVoteRevokedV2', client, fromBlock);
  await fetchHistoricalEvents('ProposalUpvoted', client, fromBlock);
  await fetchHistoricalEvents('ProposalUpvoteRevoked', client, fromBlock);
  await fetchHistoricalEvents('ProposalExpired', client, fromBlock);

  process.exit(0);
}

main();
