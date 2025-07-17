import fetchHistoricalEventsAndSaveToDBProgressively from 'src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively';
import updateProposalsInDB from 'src/features/governance/updateProposalsInDB';
import updateVotesInDB from 'src/features/governance/updateVotesInDB';
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

  const proposalIdsChanged: bigint[] = [];
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalQueued', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalDequeued', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalApproved', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalExecuted', client, fromBlock)),
  );
  proposalIdsChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalExpired', client, fromBlock)),
  );

  const proposalIdsVoteChanged: bigint[] = [];
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVoted', client, fromBlock)),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively(
      'ProposalVoteRevoked',
      client,
      fromBlock,
    )),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalVotedV2', client, fromBlock)),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively(
      'ProposalVoteRevokedV2',
      client,
      fromBlock,
    )),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively('ProposalUpvoted', client, fromBlock)),
  );
  proposalIdsVoteChanged.push(
    ...(await fetchHistoricalEventsAndSaveToDBProgressively(
      'ProposalUpvoteRevoked',
      client,
      fromBlock,
    )),
  );

  if (proposalIdsChanged.length) {
    await updateProposalsInDB(client, proposalIdsChanged);
  }
  if (proposalIdsChanged.length) {
    await updateVotesInDB(client.chain.id, proposalIdsVoteChanged);
  }

  process.exit(0);
}

main();
