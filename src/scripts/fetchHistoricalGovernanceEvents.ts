import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
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

  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalQueued', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalDequeued', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalApproved', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalExecuted', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVoted', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVoteRevoked', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVotedV2', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVoteRevokedV2', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalUpvoted', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalUpvoteRevoked', client, fromBlock);
  await fetchHistoricalEventsAndSaveToDBProgressively('ProposalExpired', client, fromBlock);

  process.exit(0);
}

main();
