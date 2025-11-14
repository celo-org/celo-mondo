/* eslint-disable no-console */
import 'dotenv/config';

import database from 'src/config/database';
import { chainsTable, eventsTable, proposalsTable, votesTable } from 'src/db/schema';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { celo } from 'viem/chains';

// Safety check: Only allow running on local database
function ensureLocalDatabase() {
  const dbUrl = process.env.POSTGRES_URL;

  if (!dbUrl) {
    console.error('❌ ERROR: POSTGRES_URL environment variable is not set');
    process.exit(1);
  }

  // Check if database URL points to localhost or local development
  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('@localhost:') ||
    dbUrl.includes('@127.0.0.1:');

  if (!isLocal) {
    console.error('❌ ERROR: This script can only be run on a local database!');
    console.error('   Your POSTGRES_URL appears to point to a remote database.');
    console.error(`   Database URL: ${dbUrl.substring(0, 30)}...`);
    console.error('');
    console.error('   To run this script, ensure your POSTGRES_URL points to localhost.');
    process.exit(1);
  }

  // Additional safety check for production environment
  if (process.env.IS_PRODUCTION_DATABASE === 'true' || process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Cannot run test data population in production environment!');
    console.error('   IS_PRODUCTION_DATABASE or NODE_ENV is set to production.');
    process.exit(1);
  }

  console.log('✅ Safety check passed: Running on local database');
  console.log('');
}

// Helper to generate mock event data
function createEvent(
  eventName: string,
  proposalId: number,
  blockNumber: number,
  transactionHash: string,
  args: Record<string, any>,
) {
  return {
    chainId: celo.id,
    eventName: eventName as any,
    args,
    address: '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972' as `0x${string}`,
    topics: [
      `0x${'0'.repeat(64)}` as `0x${string}`,
      `0x${proposalId.toString(16).padStart(64, '0')}` as `0x${string}`,
    ],
    data: '0x' as `0x${string}`,
    blockNumber: BigInt(blockNumber),
    transactionHash: transactionHash as `0x${string}`,
  };
}

// Helper to create proposal data
function createProposal(
  id: number,
  cgp: number,
  stage: ProposalStage,
  timestamp: number,
  title: string,
  executedAt?: number,
  pastId?: number,
) {
  const mockUrl = 'https://raw.githubusercontent.com/celo-org/celo-mondo/main/mock-proposal.md';

  return {
    chainId: celo.id,
    id,
    pastId: pastId || null,
    stage,
    cgp,
    url: 'https://github.com/celo-org/governance/discussions',
    cgpUrl: mockUrl,
    cgpUrlRaw: mockUrl,
    title,
    author: '@test-author',
    timestamp,
    executedAt: executedAt || null,
    proposer: '0x1234567890123456789012345678901234567890',
    deposit: BigInt('100000000000000000000'),
    networkWeight: BigInt('1000000000000000000000000'),
    transactionCount: 3,
  };
}

// Helper to create vote data
function createVotes(proposalId: number, yes: bigint, no: bigint, abstain: bigint) {
  return [
    {
      chainId: celo.id,
      type: VoteType.Yes,
      count: yes,
      proposalId,
    },
    {
      chainId: celo.id,
      type: VoteType.No,
      count: no,
      proposalId,
    },
    {
      chainId: celo.id,
      type: VoteType.Abstain,
      count: abstain,
      proposalId,
    },
  ];
}

async function main() {
  console.log('🚀 Starting test data population...');
  console.log('');

  // SAFETY CHECK: Only allow on local database
  ensureLocalDatabase();

  // Ensure chain exists
  await database.insert(chainsTable).values({ id: celo.id, name: celo.name }).onConflictDoNothing();

  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  // const WEEK = DAY * 7;
  const MONTH = DAY * 28;

  // Network weight for quorum calculations
  // Quorum is typically 1% of network weight
  const networkWeight = BigInt('1000000000000000000000000'); // 1M CELO
  const quorum = networkWeight / BigInt(100); // 1% = 10K CELO
  const halfQuorum = quorum / BigInt(2);
  const doubleQuorum = quorum * BigInt(2);

  let proposalId = 1000; // Start from 1000 to avoid conflicts
  let cgp = 9000; // Start from 9000 for test proposals
  let blockNumber = 20000000;
  let txCounter = 0;

  const events: any[] = [];
  const proposals: any[] = [];
  const votes: any[] = [];

  const getTxHash = () => `0x${'a'.repeat(64 - txCounter.toString().length)}${txCounter++}`;

  console.log('📝 Creating test proposals...');

  // 1. In draft (ProposalStage.None) - no events, just metadata
  proposals.push(
    createProposal(proposalId++, cgp++, ProposalStage.None, now, 'Test Proposal 1: In Draft'),
  );

  // 2. In queue without upvotes
  const queuedNoUpvotesId = proposalId++;
  events.push(
    createEvent('ProposalQueued', queuedNoUpvotesId, blockNumber++, getTxHash(), {
      proposalId: queuedNoUpvotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: now.toString(),
      deposit: '100000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      queuedNoUpvotesId,
      cgp++,
      ProposalStage.Queued,
      now,
      'Test Proposal 2: In Queue Without Upvotes',
    ),
  );

  // 3. In queue with upvotes
  const queuedWithUpvotesId = proposalId++;
  events.push(
    createEvent('ProposalQueued', queuedWithUpvotesId, blockNumber++, getTxHash(), {
      proposalId: queuedWithUpvotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: now.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalUpvoted', queuedWithUpvotesId, blockNumber++, getTxHash(), {
      proposalId: queuedWithUpvotesId.toString(),
      account: '0x2234567890123456789012345678901234567890',
      upvotes: '5000000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      queuedWithUpvotesId,
      cgp++,
      ProposalStage.Queued,
      now,
      'Test Proposal 3: In Queue With Upvotes',
    ),
  );

  // 4. Expired from queued stage (28 days old, never dequeued)
  const expiredFromQueueId = proposalId++;
  events.push(
    createEvent('ProposalQueued', expiredFromQueueId, blockNumber++, getTxHash(), {
      proposalId: expiredFromQueueId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - MONTH - DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      expiredFromQueueId,
      cgp++,
      ProposalStage.Expiration,
      now - MONTH - DAY,
      'Test Proposal 4: Expired From Queue',
    ),
  );

  // 5. In referendum - more YES than NO, not passing quorum, not approved
  const refYesNoQuorumNoApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refYesNoQuorumNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: refYesNoQuorumNoApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refYesNoQuorumNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: refYesNoQuorumNoApprovalId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      refYesNoQuorumNoApprovalId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 5: Referendum - Yes > No, No Quorum, No Approval',
    ),
  );
  votes.push(...createVotes(refYesNoQuorumNoApprovalId, halfQuorum, halfQuorum / BigInt(2), 0n));

  // 6. In referendum - more YES than NO, passing quorum, not approved
  const refYesQuorumNoApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refYesQuorumNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: refYesQuorumNoApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refYesQuorumNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: refYesQuorumNoApprovalId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      refYesQuorumNoApprovalId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 6: Referendum - Yes > No, Passing Quorum, No Approval',
    ),
  );
  votes.push(...createVotes(refYesQuorumNoApprovalId, doubleQuorum, quorum, 0n));

  // 7. In referendum - more YES than NO, not passing quorum, approved
  const refYesNoQuorumApprovedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refYesNoQuorumApprovedId, blockNumber++, getTxHash(), {
      proposalId: refYesNoQuorumApprovedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refYesNoQuorumApprovedId, blockNumber++, getTxHash(), {
      proposalId: refYesNoQuorumApprovedId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', refYesNoQuorumApprovedId, blockNumber++, getTxHash(), {
      proposalId: refYesNoQuorumApprovedId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      refYesNoQuorumApprovedId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 7: Referendum - Yes > No, No Quorum, Approved',
    ),
  );
  votes.push(...createVotes(refYesNoQuorumApprovedId, halfQuorum, halfQuorum / BigInt(2), 0n));

  // 8. In referendum - more YES than NO, passing quorum, approved
  const refYesQuorumApprovedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refYesQuorumApprovedId, blockNumber++, getTxHash(), {
      proposalId: refYesQuorumApprovedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refYesQuorumApprovedId, blockNumber++, getTxHash(), {
      proposalId: refYesQuorumApprovedId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', refYesQuorumApprovedId, blockNumber++, getTxHash(), {
      proposalId: refYesQuorumApprovedId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      refYesQuorumApprovedId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 8: Referendum - Yes > No, Passing Quorum, Approved',
    ),
  );
  votes.push(...createVotes(refYesQuorumApprovedId, doubleQuorum, quorum, 0n));

  // 9. In referendum - more NO than YES, not passing quorum
  const refNoNoQuorumId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refNoNoQuorumId, blockNumber++, getTxHash(), {
      proposalId: refNoNoQuorumId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refNoNoQuorumId, blockNumber++, getTxHash(), {
      proposalId: refNoNoQuorumId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      refNoNoQuorumId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 9: Referendum - No > Yes, No Quorum',
    ),
  );
  votes.push(...createVotes(refNoNoQuorumId, halfQuorum / BigInt(2), halfQuorum, 0n));

  // 10. In referendum - more NO than YES, passing quorum
  const refNoQuorumId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refNoQuorumId, blockNumber++, getTxHash(), {
      proposalId: refNoQuorumId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refNoQuorumId, blockNumber++, getTxHash(), {
      proposalId: refNoQuorumId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      refNoQuorumId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 10: Referendum - No > Yes, Passing Quorum',
    ),
  );
  votes.push(...createVotes(refNoQuorumId, quorum, doubleQuorum, 0n));

  // 11. In referendum - equal YES and NO votes (tied)
  const refTiedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', refTiedId, blockNumber++, getTxHash(), {
      proposalId: refTiedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refTiedId, blockNumber++, getTxHash(), {
      proposalId: refTiedId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      refTiedId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 11: Referendum - Tied Votes',
    ),
  );
  votes.push(...createVotes(refTiedId, quorum, quorum, 0n));

  // 12. In execution - not yet approved
  const execNoApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', execNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: execNoApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', execNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: execNoApprovalId.toString(),
      timestamp: (now - 4 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      execNoApprovalId,
      cgp++,
      ProposalStage.Execution,
      now - 4 * DAY,
      'Test Proposal 12: Execution - No Approval',
    ),
  );
  votes.push(...createVotes(execNoApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 13. In execution - with partial approval
  // Note: Partial approval is tracked externally, but we'll just mark it differently in the title
  const execPartialApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', execPartialApprovalId, blockNumber++, getTxHash(), {
      proposalId: execPartialApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', execPartialApprovalId, blockNumber++, getTxHash(), {
      proposalId: execPartialApprovalId.toString(),
      timestamp: (now - 4 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      execPartialApprovalId,
      cgp++,
      ProposalStage.Execution,
      now - 4 * DAY,
      'Test Proposal 13: Execution - Partial Approval',
    ),
  );
  votes.push(...createVotes(execPartialApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 14. In execution - with full approval
  const execFullApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', execFullApprovalId, blockNumber++, getTxHash(), {
      proposalId: execFullApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', execFullApprovalId, blockNumber++, getTxHash(), {
      proposalId: execFullApprovalId.toString(),
      timestamp: (now - 4 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', execFullApprovalId, blockNumber++, getTxHash(), {
      proposalId: execFullApprovalId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      execFullApprovalId,
      cgp++,
      ProposalStage.Execution,
      now - 4 * DAY,
      'Test Proposal 14: Execution - Full Approval',
    ),
  );
  votes.push(...createVotes(execFullApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 15. Executed (successfully completed)
  const executedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', executedId, blockNumber++, getTxHash(), {
      proposalId: executedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 20 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', executedId, blockNumber++, getTxHash(), {
      proposalId: executedId.toString(),
      timestamp: (now - 12 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', executedId, blockNumber++, getTxHash(), {
      proposalId: executedId.toString(),
    }),
  );
  events.push(
    createEvent('ProposalExecuted', executedId, blockNumber++, getTxHash(), {
      proposalId: executedId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      executedId,
      cgp++,
      ProposalStage.Executed,
      now - 12 * DAY,
      'Test Proposal 15: Successfully Executed',
      now - 5 * DAY,
    ),
  );
  votes.push(...createVotes(executedId, doubleQuorum, quorum / BigInt(2), 0n));

  // 16. Expired from referendum - with full approval
  const expiredRefApprovedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', expiredRefApprovedId, blockNumber++, getTxHash(), {
      proposalId: expiredRefApprovedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 20 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', expiredRefApprovedId, blockNumber++, getTxHash(), {
      proposalId: expiredRefApprovedId.toString(),
      timestamp: (now - 12 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', expiredRefApprovedId, blockNumber++, getTxHash(), {
      proposalId: expiredRefApprovedId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      expiredRefApprovedId,
      cgp++,
      ProposalStage.Expiration,
      now - 12 * DAY,
      'Test Proposal 16: Expired From Referendum - Approved',
    ),
  );
  votes.push(...createVotes(expiredRefApprovedId, doubleQuorum, quorum / BigInt(2), 0n));

  // 17. Expired from referendum - never approved
  const expiredRefNoApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', expiredRefNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: expiredRefNoApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 20 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', expiredRefNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: expiredRefNoApprovalId.toString(),
      timestamp: (now - 12 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      expiredRefNoApprovalId,
      cgp++,
      ProposalStage.Expiration,
      now - 12 * DAY,
      'Test Proposal 17: Expired From Referendum - No Approval',
    ),
  );
  votes.push(...createVotes(expiredRefNoApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 18. Expired from execution - with full approval
  const expiredExecApprovedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', expiredExecApprovedId, blockNumber++, getTxHash(), {
      proposalId: expiredExecApprovedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 20 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', expiredExecApprovedId, blockNumber++, getTxHash(), {
      proposalId: expiredExecApprovedId.toString(),
      timestamp: (now - 12 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', expiredExecApprovedId, blockNumber++, getTxHash(), {
      proposalId: expiredExecApprovedId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      expiredExecApprovedId,
      cgp++,
      ProposalStage.Expiration,
      now - 12 * DAY,
      'Test Proposal 18: Expired From Execution - Approved',
    ),
  );
  votes.push(...createVotes(expiredExecApprovedId, doubleQuorum, quorum / BigInt(2), 0n));

  // 19. Expired from execution - never approved
  const expiredExecNoApprovalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', expiredExecNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: expiredExecNoApprovalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 20 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', expiredExecNoApprovalId, blockNumber++, getTxHash(), {
      proposalId: expiredExecNoApprovalId.toString(),
      timestamp: (now - 12 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      expiredExecNoApprovalId,
      cgp++,
      ProposalStage.Expiration,
      now - 12 * DAY,
      'Test Proposal 19: Expired From Execution - No Approval',
    ),
  );
  votes.push(...createVotes(expiredExecNoApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 20. Withdrawn from queue
  const withdrawnQueueId = proposalId++;
  events.push(
    createEvent('ProposalQueued', withdrawnQueueId, blockNumber++, getTxHash(), {
      proposalId: withdrawnQueueId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      withdrawnQueueId,
      cgp++,
      ProposalStage.Withdrawn,
      now - 10 * DAY,
      'Test Proposal 20: Withdrawn From Queue',
    ),
  );

  // 21. Withdrawn from referendum
  const withdrawnRefId = proposalId++;
  events.push(
    createEvent('ProposalQueued', withdrawnRefId, blockNumber++, getTxHash(), {
      proposalId: withdrawnRefId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', withdrawnRefId, blockNumber++, getTxHash(), {
      proposalId: withdrawnRefId.toString(),
      timestamp: (now - 5 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      withdrawnRefId,
      cgp++,
      ProposalStage.Withdrawn,
      now - 5 * DAY,
      'Test Proposal 21: Withdrawn From Referendum',
    ),
  );
  votes.push(...createVotes(withdrawnRefId, quorum, quorum / BigInt(2), 0n));

  // 22. Withdrawn from execution
  const withdrawnExecId = proposalId++;
  events.push(
    createEvent('ProposalQueued', withdrawnExecId, blockNumber++, getTxHash(), {
      proposalId: withdrawnExecId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 12 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', withdrawnExecId, blockNumber++, getTxHash(), {
      proposalId: withdrawnExecId.toString(),
      timestamp: (now - 5 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      withdrawnExecId,
      cgp++,
      ProposalStage.Withdrawn,
      now - 5 * DAY,
      'Test Proposal 22: Withdrawn From Execution',
    ),
  );
  votes.push(...createVotes(withdrawnExecId, doubleQuorum, quorum / BigInt(2), 0n));

  // 23. Rejected (expired with more NO than YES)
  const rejectedId = proposalId++;
  events.push(
    createEvent('ProposalQueued', rejectedId, blockNumber++, getTxHash(), {
      proposalId: rejectedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 20 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', rejectedId, blockNumber++, getTxHash(), {
      proposalId: rejectedId.toString(),
      timestamp: (now - 12 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      rejectedId,
      cgp++,
      ProposalStage.Rejected,
      now - 12 * DAY,
      'Test Proposal 23: Rejected (No > Yes)',
    ),
  );
  votes.push(...createVotes(rejectedId, quorum, doubleQuorum, 0n));

  // 24. Proposal with revoked upvotes
  const revokedUpvotesId = proposalId++;
  events.push(
    createEvent('ProposalQueued', revokedUpvotesId, blockNumber++, getTxHash(), {
      proposalId: revokedUpvotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: now.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalUpvoted', revokedUpvotesId, blockNumber++, getTxHash(), {
      proposalId: revokedUpvotesId.toString(),
      account: '0x2234567890123456789012345678901234567890',
      upvotes: '5000000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalUpvoteRevoked', revokedUpvotesId, blockNumber++, getTxHash(), {
      proposalId: revokedUpvotesId.toString(),
      account: '0x2234567890123456789012345678901234567890',
      upvotes: '5000000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      revokedUpvotesId,
      cgp++,
      ProposalStage.Queued,
      now,
      'Test Proposal 24: With Revoked Upvotes',
    ),
  );

  // 25. Proposal with revoked votes
  const revokedVotesId = proposalId++;
  events.push(
    createEvent('ProposalQueued', revokedVotesId, blockNumber++, getTxHash(), {
      proposalId: revokedVotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', revokedVotesId, blockNumber++, getTxHash(), {
      proposalId: revokedVotesId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  events.push(
    createEvent('ProposalVotedV2', revokedVotesId, blockNumber++, getTxHash(), {
      proposalId: revokedVotesId.toString(),
      account: '0x3234567890123456789012345678901234567890',
      value: '1',
      weight: '1000000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalVoteRevokedV2', revokedVotesId, blockNumber++, getTxHash(), {
      proposalId: revokedVotesId.toString(),
      account: '0x3234567890123456789012345678901234567890',
      value: '1',
      weight: '1000000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      revokedVotesId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 25: With Revoked Votes',
    ),
  );
  votes.push(...createVotes(revokedVotesId, quorum, halfQuorum, 0n));

  // 26. Re-submitted proposal (has pastId)
  const originalProposalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', originalProposalId, blockNumber++, getTxHash(), {
      proposalId: originalProposalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 30 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', originalProposalId, blockNumber++, getTxHash(), {
      proposalId: originalProposalId.toString(),
      timestamp: (now - 20 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      originalProposalId,
      cgp,
      ProposalStage.Rejected,
      now - 20 * DAY,
      'Test Proposal 26a: Original (Rejected)',
    ),
  );
  votes.push(...createVotes(originalProposalId, quorum, doubleQuorum, 0n));

  const resubmittedProposalId = proposalId++;
  events.push(
    createEvent('ProposalQueued', resubmittedProposalId, blockNumber++, getTxHash(), {
      proposalId: resubmittedProposalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: (now - 10 * DAY).toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', resubmittedProposalId, blockNumber++, getTxHash(), {
      proposalId: resubmittedProposalId.toString(),
      timestamp: (now - 3 * DAY).toString(),
    }),
  );
  proposals.push(
    createProposal(
      resubmittedProposalId,
      cgp++,
      ProposalStage.Referendum,
      now - 3 * DAY,
      'Test Proposal 26b: Re-submitted (Active)',
      undefined,
      originalProposalId, // pastId links to original
    ),
  );
  votes.push(...createVotes(resubmittedProposalId, doubleQuorum, quorum, 0n));

  console.log(
    `📊 Generated ${proposals.length} proposals, ${events.length} events, ${votes.length} vote records`,
  );

  // Insert all data
  console.log('💾 Inserting events...');
  if (events.length > 0) {
    await database.insert(eventsTable).values(events).onConflictDoNothing();
    console.log(`✅ Inserted ${events.length} events`);
  }

  console.log('💾 Inserting proposals...');
  if (proposals.length > 0) {
    await database.insert(proposalsTable).values(proposals).onConflictDoNothing();
    console.log(`✅ Inserted ${proposals.length} proposals`);
  }

  console.log('💾 Inserting votes...');
  if (votes.length > 0) {
    await database.insert(votesTable).values(votes).onConflictDoNothing();
    console.log(`✅ Inserted ${votes.length} vote records`);
  }

  console.log('');
  console.log('🎉 Test data population complete!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   - Proposals: ${proposals.length}`);
  console.log(`   - Events: ${events.length}`);
  console.log(`   - Vote records: ${votes.length}`);
  console.log(`   - Proposal ID range: 1000-${proposalId - 1}`);
  console.log(`   - CGP range: 9000-${cgp - 1}`);
  console.log('');
  console.log('✨ All 26 proposal states have been created!');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error populating test data:', error);
  process.exit(1);
});
