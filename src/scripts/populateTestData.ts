/* eslint-disable no-console */
import 'dotenv/config';
import { sql } from 'drizzle-orm';

import database from 'src/config/database';
import {
  approvalsTable,
  chainsTable,
  eventsTable,
  proposalsTable,
  votesTable,
} from 'src/db/schema';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { celo } from 'viem/chains';

// Safety check: Only allow running on local database or staging from CI
function ensureLocalDatabase() {
  const isCI = process.env.CI === 'true';
  const dbUrl = isCI ? process.env.STAGING_POSTGRES_URL : process.env.POSTGRES_URL;

  if (!dbUrl) {
    console.error('❌ ERROR: POSTGRES_URL/STAGING_POSTGRES_URL environment variable is not set');
    process.exit(1);
  }

  // Check if database URL points to localhost or local development
  const isLocal =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('@localhost:') ||
    dbUrl.includes('@127.0.0.1:');

  // Allow running on remote database only if in CI (assumes staging)
  if (!isLocal) {
    if (isCI) {
      console.log('✅ Safety check passed: Running on staging database from CI');
      console.log(`   Database: ${dbUrl.substring(0, 30)}...`);
      console.log('');
      return;
    }

    console.error('❌ ERROR: This script can only be run on a local database!');
    console.error('   Your POSTGRES_URL appears to point to a remote database.');
    console.error(`   Database URL: ${dbUrl.substring(0, 30)}...`);
    console.error('');
    console.error('   To run this script:');
    console.error('   - Locally: Ensure your POSTGRES_URL points to localhost');
    console.error('   - CI: Script will automatically use POSTGRES_URL (staging)');
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

// Helper to convert Unix timestamp to ISO string
function toISOString(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

// Helper to create proposal data
function createProposal(
  id: number,
  cgp: number,
  stage: ProposalStage,
  timestamp: number,
  title: string,
  options: {
    executedAt?: number;
    pastId?: number;
    queuedAt?: string;
    queuedAtBlockNumber?: bigint;
    dequeuedAt?: string;
    dequeuedAtBlockNumber?: bigint;
    approvedAt?: string;
    approvedAtBlockNumber?: bigint;
    executedAtTimestamp?: string;
    executedAtBlockNumber?: bigint;
    quorumVotesRequired?: bigint;
  } = {},
) {
  const mockUrl = 'https://raw.githubusercontent.com/celo-org/celo-mondo/main/mock-proposal.md';

  return {
    chainId: celo.id,
    id,
    pastId: options.pastId || null,
    stage,
    cgp,
    url: 'https://github.com/celo-org/governance/discussions',
    cgpUrl: mockUrl,
    cgpUrlRaw: mockUrl,
    title,
    author: '@test-author',
    timestamp,
    proposer: '0x1234567890123456789012345678901234567890',
    deposit: BigInt('100000000000000000000'),
    networkWeight: BigInt('1000000000000000000000000'),
    transactionCount: 3,
    queuedAt: options.queuedAt || null,
    queuedAtBlockNumber: options.queuedAtBlockNumber || null,
    dequeuedAt: options.dequeuedAt || null,
    dequeuedAtBlockNumber: options.dequeuedAtBlockNumber || null,
    approvedAt: options.approvedAt || null,
    approvedAtBlockNumber: options.approvedAtBlockNumber || null,
    executedAt: options.executedAtTimestamp || null,
    executedAtBlockNumber: options.executedAtBlockNumber || null,
    quorumVotesRequired: options.quorumVotesRequired || null,
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

// Mock multisig address for test data
const MOCK_MULTISIG_ADDRESS = '0xA533Ca259b330c7A88f74E000a3FaEa2d63B7ABC';

// Mock approver addresses (signers)
const MOCK_APPROVERS = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
];

// Helper to create multisig Confirmation event
function createConfirmationEvent(
  proposalId: number,
  multisigTxId: number,
  approver: string,
  blockNumber: number,
  transactionHash: string,
) {
  return {
    chainId: celo.id,
    eventName: 'Confirmation' as any,
    args: {
      sender: approver,
      transactionId: BigInt(multisigTxId),
    },
    address: MOCK_MULTISIG_ADDRESS.toLowerCase() as `0x${string}`,
    topics: [
      `0x${'0'.repeat(64)}` as `0x${string}`,
      `0x${multisigTxId.toString(16).padStart(64, '0')}` as `0x${string}`,
    ],
    data: '0x' as `0x${string}`,
    blockNumber: BigInt(blockNumber),
    transactionHash: transactionHash as `0x${string}`,
  };
}

// Helper to create approval data
function createApproval(
  proposalId: number,
  multisigTxId: number,
  approver: string,
  confirmedAt: number,
  blockNumber: number,
  transactionHash: string,
) {
  return {
    chainId: celo.id,
    proposalId,
    multisigTxId: BigInt(multisigTxId),
    approver: approver as `0x${string}`,
    confirmedAt,
    blockNumber: BigInt(blockNumber),
    transactionHash: transactionHash as `0x${string}`,
  };
}

/**
 * Populates the database with test proposal data covering all possible proposal states.
 *
 * This script:
 * 1. Cleans up any existing test data (proposal IDs 1000-1099)
 * 2. Creates 26 test proposals with realistic blockchain data (events, votes, approvals)
 * 3. Uses deterministic IDs and timestamps relative to the current time
 *
 * ID Ranges:
 * - Proposal IDs: 1000-1099 (TEST_PROPOSAL_ID_START to TEST_PROPOSAL_ID_END)
 * - CGP numbers: 9000+ (TEST_CGP_START)
 * - Multisig TX IDs: 11000-11099 (proposalId + 10000)
 *
 * Event Storage:
 * - Events store IDs in topics[2] as 64-character hex strings (PostgreSQL arrays are 1-indexed)
 * - Proposal events (ProposalQueued, etc.): Store proposalId in topics[2]
 * - Confirmation events (multisig approvals): Store multisigTxId in topics[2]
 *
 * Safety:
 * - Only runs on local databases OR staging from CI
 * - Idempotent: Safe to run multiple times
 * - Won't affect real proposals (ID ranges are reserved for testing)
 *
 * Environment Variables:
 * - POSTGRES_URL: Database connection string (required)
 * - IS_STAGING_DATABASE: Set to 'true' to allow running on staging (requires CI=true)
 * - CI: Set to 'true' when running in CI environment
 * - IS_PRODUCTION_DATABASE: Must NOT be 'true' (safety check)
 * - NODE_ENV: Must NOT be 'production' (safety check)
 *
 * Usage:
 * - Local: yarn populate-test-data (with local POSTGRES_URL)
 * - Staging (CI): Runs automatically weekly via GitHub Actions
 * - Manual trigger: GitHub Actions UI -> "Populate Staging Test Data" -> Run workflow
 */
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

  // Test data ID ranges - using 1000-1099 to avoid conflicts with real data
  const TEST_PROPOSAL_ID_START = 1000;
  const TEST_PROPOSAL_ID_END = 1100; // Exclusive
  const TEST_CGP_START = 9000;

  // Multisig transaction IDs are calculated as proposalId + 10000 (see addApprovals helper)
  // So for proposals 1000-1099, multisigTxIds will be 11000-11099
  const TEST_MULTISIG_TX_ID_START = TEST_PROPOSAL_ID_START + 10000;
  const TEST_MULTISIG_TX_ID_END = TEST_PROPOSAL_ID_END + 10000; // Exclusive

  // Convert to hex for event topics queries (topics[2] stores these IDs in events)
  const TEST_PROPOSAL_ID_START_HEX = `0x${TEST_PROPOSAL_ID_START.toString(16).padStart(64, '0')}`;
  const TEST_PROPOSAL_ID_END_HEX = `0x${TEST_PROPOSAL_ID_END.toString(16).padStart(64, '0')}`;
  const TEST_MULTISIG_TX_ID_START_HEX = `0x${TEST_MULTISIG_TX_ID_START.toString(16).padStart(64, '0')}`;
  const TEST_MULTISIG_TX_ID_END_HEX = `0x${TEST_MULTISIG_TX_ID_END.toString(16).padStart(64, '0')}`;

  let proposalId = TEST_PROPOSAL_ID_START;
  let cgp = TEST_CGP_START;
  let currentBlockNumber = 1000000000; // Start at a high block number
  let lastTimestamp = now - 80 * DAY; // Start from earliest timestamp we'll use
  let txCounter = 0;

  const events: any[] = [];
  const proposals: any[] = [];
  const votes: any[] = [];
  const approvals: any[] = [];

  const getTxHash = () => `0x${'a'.repeat(64 - txCounter.toString().length)}${txCounter++}`;

  // Helper to get block number for a timestamp (roughly 1 block per second)
  const getBlockNumber = (timestamp: number): bigint => {
    const secondsSinceLastBlock = timestamp - lastTimestamp;
    currentBlockNumber += secondsSinceLastBlock;
    lastTimestamp = timestamp;
    return BigInt(currentBlockNumber);
  };

  // Helper to add approvals for a proposal
  const addApprovals = (proposalId: number, count: 1 | 2 | 3, timestamp: number) => {
    // Generate unique multisig transaction ID by adding 10000 to proposalId
    // This ensures multisig TX IDs don't conflict with proposal IDs
    // For test proposals 1000-1099, this creates multisigTxIds 11000-11099
    const multisigTxId = proposalId + 10000;
    for (let i = 0; i < count; i++) {
      const approver = MOCK_APPROVERS[i];
      const txHash = getTxHash();
      const confirmedAt = timestamp + i * 60; // Each approval 1 minute apart
      const block = getBlockNumber(confirmedAt);

      // Add Confirmation event
      events.push(
        createConfirmationEvent(proposalId, multisigTxId, approver, Number(block), txHash),
      );

      // Add approval record
      approvals.push(
        createApproval(proposalId, multisigTxId, approver, confirmedAt, Number(block), txHash),
      );
    }
  };

  console.log('📝 Creating test proposals...');

  // 1. In draft (ProposalStage.None) - no events, just metadata
  // Draft proposals have no blockchain events yet
  proposals.push(
    createProposal(
      proposalId++,
      cgp++,
      ProposalStage.None,
      now - 2 * DAY,
      'Test Proposal 1: In Draft',
    ),
  );

  // 2. In queue without upvotes
  const queuedNoUpvotesId = proposalId++;
  const queuedNoUpvotesTime = now - 5 * DAY;
  const queuedNoUpvotesBlock = getBlockNumber(queuedNoUpvotesTime);
  events.push(
    createEvent('ProposalQueued', queuedNoUpvotesId, Number(queuedNoUpvotesBlock), getTxHash(), {
      proposalId: queuedNoUpvotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: queuedNoUpvotesTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      queuedNoUpvotesId,
      cgp++,
      ProposalStage.Queued,
      queuedNoUpvotesTime,
      'Test Proposal 2: In Queue Without Upvotes',
      {
        queuedAt: toISOString(queuedNoUpvotesTime),
        queuedAtBlockNumber: queuedNoUpvotesBlock,
      },
    ),
  );

  // 3. In queue with upvotes
  const queuedWithUpvotesId = proposalId++;
  const queuedWithUpvotesTime = now - 3 * DAY;
  const queuedWithUpvotesBlock = getBlockNumber(queuedWithUpvotesTime);
  events.push(
    createEvent(
      'ProposalQueued',
      queuedWithUpvotesId,
      Number(queuedWithUpvotesBlock),
      getTxHash(),
      {
        proposalId: queuedWithUpvotesId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: queuedWithUpvotesTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalUpvoted',
      queuedWithUpvotesId,
      Number(getBlockNumber(queuedWithUpvotesTime + 3600)),
      getTxHash(),
      {
        // 1 hour later
        proposalId: queuedWithUpvotesId.toString(),
        account: '0x2234567890123456789012345678901234567890',
        upvotes: '5000000000000000000000',
      },
    ),
  );
  proposals.push(
    createProposal(
      queuedWithUpvotesId,
      cgp++,
      ProposalStage.Queued,
      queuedWithUpvotesTime,
      'Test Proposal 3: In Queue With Upvotes',
      {
        queuedAt: toISOString(queuedWithUpvotesTime),
        queuedAtBlockNumber: queuedWithUpvotesBlock,
      },
    ),
  );

  // 4. Expired from queued stage (28 days old, never dequeued)
  const expiredFromQueueId = proposalId++;
  const expiredFromQueueTime = now - MONTH - DAY;
  const expiredFromQueueBlock = getBlockNumber(expiredFromQueueTime);
  events.push(
    createEvent('ProposalQueued', expiredFromQueueId, Number(expiredFromQueueBlock), getTxHash(), {
      proposalId: expiredFromQueueId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: expiredFromQueueTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      expiredFromQueueId,
      cgp++,
      ProposalStage.Expiration,
      expiredFromQueueTime,
      'Test Proposal 4: Expired From Queue',
      {
        queuedAt: toISOString(expiredFromQueueTime),
        queuedAtBlockNumber: expiredFromQueueBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );

  // 5. In referendum - more YES than NO, not passing quorum, not approved
  const refYesNoQuorumNoApprovalId = proposalId++;
  const refYesNoQuorumNoApprovalQueuedTime = now - 10 * DAY;
  const refYesNoQuorumNoApprovalDequeuedTime = now - 3 * DAY;
  const refYesNoQuorumNoApprovalQueuedBlock = getBlockNumber(refYesNoQuorumNoApprovalQueuedTime);
  const refYesNoQuorumNoApprovalDequeuedBlock = getBlockNumber(
    refYesNoQuorumNoApprovalDequeuedTime,
  );
  events.push(
    createEvent(
      'ProposalQueued',
      refYesNoQuorumNoApprovalId,
      Number(refYesNoQuorumNoApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: refYesNoQuorumNoApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: refYesNoQuorumNoApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      refYesNoQuorumNoApprovalId,
      Number(refYesNoQuorumNoApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: refYesNoQuorumNoApprovalId.toString(),
        timestamp: refYesNoQuorumNoApprovalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      refYesNoQuorumNoApprovalId,
      cgp++,
      ProposalStage.Referendum,
      refYesNoQuorumNoApprovalQueuedTime,
      'Test Proposal 5: Referendum - Yes > No, No Quorum, No Approval',
      {
        queuedAt: toISOString(refYesNoQuorumNoApprovalQueuedTime),
        queuedAtBlockNumber: refYesNoQuorumNoApprovalQueuedBlock,
        dequeuedAt: toISOString(refYesNoQuorumNoApprovalDequeuedTime),
        dequeuedAtBlockNumber: refYesNoQuorumNoApprovalDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(refYesNoQuorumNoApprovalId, halfQuorum, halfQuorum / BigInt(2), 0n));
  // Add 1 approval
  addApprovals(refYesNoQuorumNoApprovalId, 1, refYesNoQuorumNoApprovalDequeuedTime + 1 * DAY);

  // 6. In referendum - more YES than NO, passing quorum, not approved
  const refYesQuorumNoApprovalId = proposalId++;
  const refYesQuorumNoApprovalQueuedTime = now - 12 * DAY;
  const refYesQuorumNoApprovalDequeuedTime = now - 8 * DAY;
  const refYesQuorumNoApprovalQueuedBlock = getBlockNumber(refYesQuorumNoApprovalQueuedTime);
  const refYesQuorumNoApprovalDequeuedBlock = getBlockNumber(refYesQuorumNoApprovalDequeuedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      refYesQuorumNoApprovalId,
      Number(refYesQuorumNoApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: refYesQuorumNoApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: refYesQuorumNoApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      refYesQuorumNoApprovalId,
      Number(refYesQuorumNoApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: refYesQuorumNoApprovalId.toString(),
        timestamp: refYesQuorumNoApprovalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      refYesQuorumNoApprovalId,
      cgp++,
      ProposalStage.Referendum,
      refYesQuorumNoApprovalQueuedTime,
      'Test Proposal 6: Referendum - Yes > No, Passing Quorum, No Approval',
      {
        queuedAt: toISOString(refYesQuorumNoApprovalQueuedTime),
        queuedAtBlockNumber: refYesQuorumNoApprovalQueuedBlock,
        dequeuedAt: toISOString(refYesQuorumNoApprovalDequeuedTime),
        dequeuedAtBlockNumber: refYesQuorumNoApprovalDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(refYesQuorumNoApprovalId, doubleQuorum, quorum, 0n));
  // Add 2 approvals
  addApprovals(refYesQuorumNoApprovalId, 2, refYesQuorumNoApprovalDequeuedTime + 2 * DAY);

  // 7. In referendum - more YES than NO, not passing quorum, approved
  const refYesNoQuorumApprovedId = proposalId++;
  const refYesNoQuorumApprovedQueuedTime = now - 16 * DAY;
  const refYesNoQuorumApprovedDequeuedTime = now - 12 * DAY;
  const refYesNoQuorumApprovedApprovedTime = now - 5 * DAY;
  const refYesNoQuorumApprovedQueuedBlock = getBlockNumber(refYesNoQuorumApprovedQueuedTime);
  const refYesNoQuorumApprovedDequeuedBlock = getBlockNumber(refYesNoQuorumApprovedDequeuedTime);
  const refYesNoQuorumApprovedApprovedBlock = getBlockNumber(refYesNoQuorumApprovedApprovedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      refYesNoQuorumApprovedId,
      Number(refYesNoQuorumApprovedQueuedBlock),
      getTxHash(),
      {
        proposalId: refYesNoQuorumApprovedId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: refYesNoQuorumApprovedQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      refYesNoQuorumApprovedId,
      Number(refYesNoQuorumApprovedDequeuedBlock),
      getTxHash(),
      {
        proposalId: refYesNoQuorumApprovedId.toString(),
        timestamp: refYesNoQuorumApprovedDequeuedTime.toString(),
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalApproved',
      refYesNoQuorumApprovedId,
      Number(refYesNoQuorumApprovedApprovedBlock),
      getTxHash(),
      {
        proposalId: refYesNoQuorumApprovedId.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      refYesNoQuorumApprovedId,
      cgp++,
      ProposalStage.Referendum,
      refYesNoQuorumApprovedQueuedTime,
      'Test Proposal 7: Referendum - Yes > No, No Quorum, Approved',
      {
        queuedAt: toISOString(refYesNoQuorumApprovedQueuedTime),
        queuedAtBlockNumber: refYesNoQuorumApprovedQueuedBlock,
        dequeuedAt: toISOString(refYesNoQuorumApprovedDequeuedTime),
        dequeuedAtBlockNumber: refYesNoQuorumApprovedDequeuedBlock,
        approvedAt: toISOString(refYesNoQuorumApprovedApprovedTime),
        approvedAtBlockNumber: refYesNoQuorumApprovedApprovedBlock,
      },
    ),
  );
  votes.push(...createVotes(refYesNoQuorumApprovedId, halfQuorum, halfQuorum / BigInt(2), 0n));
  // Add 3 approvals (fully approved) - approvals happen before the ProposalApproved event
  addApprovals(refYesNoQuorumApprovedId, 3, refYesNoQuorumApprovedDequeuedTime + 7 * DAY);

  // 8. In referendum - more YES than NO, passing quorum, approved
  const refYesQuorumApprovedId = proposalId++;
  const refYesQuorumApprovedQueuedTime = now - 18 * DAY;
  const refYesQuorumApprovedDequeuedTime = now - 14 * DAY;
  const refYesQuorumApprovedApprovedTime = now - 6 * DAY;
  const refYesQuorumApprovedQueuedBlock = getBlockNumber(refYesQuorumApprovedQueuedTime);
  const refYesQuorumApprovedDequeuedBlock = getBlockNumber(refYesQuorumApprovedDequeuedTime);
  const refYesQuorumApprovedApprovedBlock = getBlockNumber(refYesQuorumApprovedApprovedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      refYesQuorumApprovedId,
      Number(refYesQuorumApprovedQueuedBlock),
      getTxHash(),
      {
        proposalId: refYesQuorumApprovedId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: refYesQuorumApprovedQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      refYesQuorumApprovedId,
      Number(refYesQuorumApprovedDequeuedBlock),
      getTxHash(),
      {
        proposalId: refYesQuorumApprovedId.toString(),
        timestamp: refYesQuorumApprovedDequeuedTime.toString(),
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalApproved',
      refYesQuorumApprovedId,
      Number(refYesQuorumApprovedApprovedBlock),
      getTxHash(),
      {
        proposalId: refYesQuorumApprovedId.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      refYesQuorumApprovedId,
      cgp++,
      ProposalStage.Referendum,
      refYesQuorumApprovedQueuedTime,
      'Test Proposal 8: Referendum - Yes > No, Passing Quorum, Approved',
      {
        queuedAt: toISOString(refYesQuorumApprovedQueuedTime),
        queuedAtBlockNumber: refYesQuorumApprovedQueuedBlock,
        dequeuedAt: toISOString(refYesQuorumApprovedDequeuedTime),
        dequeuedAtBlockNumber: refYesQuorumApprovedDequeuedBlock,
        approvedAt: toISOString(refYesQuorumApprovedApprovedTime),
        approvedAtBlockNumber: refYesQuorumApprovedApprovedBlock,
      },
    ),
  );
  votes.push(...createVotes(refYesQuorumApprovedId, doubleQuorum, quorum, 0n));
  // Add 3 approvals (fully approved)
  addApprovals(refYesQuorumApprovedId, 3, refYesQuorumApprovedDequeuedTime + 8 * DAY);

  // 9. In referendum - more NO than YES, not passing quorum
  const refNoNoQuorumId = proposalId++;
  const refNoNoQuorumQueuedTime = now - 14 * DAY;
  const refNoNoQuorumDequeuedTime = now - 10 * DAY;
  const refNoNoQuorumQueuedBlock = getBlockNumber(refNoNoQuorumQueuedTime);
  const refNoNoQuorumDequeuedBlock = getBlockNumber(refNoNoQuorumDequeuedTime);
  events.push(
    createEvent('ProposalQueued', refNoNoQuorumId, Number(refNoNoQuorumQueuedBlock), getTxHash(), {
      proposalId: refNoNoQuorumId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: refNoNoQuorumQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      refNoNoQuorumId,
      Number(refNoNoQuorumDequeuedBlock),
      getTxHash(),
      {
        proposalId: refNoNoQuorumId.toString(),
        timestamp: refNoNoQuorumDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      refNoNoQuorumId,
      cgp++,
      ProposalStage.Referendum,
      refNoNoQuorumQueuedTime,
      'Test Proposal 9: Referendum - No > Yes, No Quorum',
      {
        queuedAt: toISOString(refNoNoQuorumQueuedTime),
        queuedAtBlockNumber: refNoNoQuorumQueuedBlock,
        dequeuedAt: toISOString(refNoNoQuorumDequeuedTime),
        dequeuedAtBlockNumber: refNoNoQuorumDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(refNoNoQuorumId, halfQuorum / BigInt(2), halfQuorum, 0n));

  // 10. In referendum - more NO than YES, passing quorum
  const refNoQuorumId = proposalId++;
  const refNoQuorumQueuedTime = now - 15 * DAY;
  const refNoQuorumDequeuedTime = now - 11 * DAY;
  const refNoQuorumQueuedBlock = getBlockNumber(refNoQuorumQueuedTime);
  const refNoQuorumDequeuedBlock = getBlockNumber(refNoQuorumDequeuedTime);
  events.push(
    createEvent('ProposalQueued', refNoQuorumId, Number(refNoQuorumQueuedBlock), getTxHash(), {
      proposalId: refNoQuorumId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: refNoQuorumQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refNoQuorumId, Number(refNoQuorumDequeuedBlock), getTxHash(), {
      proposalId: refNoQuorumId.toString(),
      timestamp: refNoQuorumDequeuedTime.toString(),
    }),
  );
  proposals.push(
    createProposal(
      refNoQuorumId,
      cgp++,
      ProposalStage.Referendum,
      refNoQuorumQueuedTime,
      'Test Proposal 10: Referendum - No > Yes, Passing Quorum',
      {
        queuedAt: toISOString(refNoQuorumQueuedTime),
        queuedAtBlockNumber: refNoQuorumQueuedBlock,
        dequeuedAt: toISOString(refNoQuorumDequeuedTime),
        dequeuedAtBlockNumber: refNoQuorumDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(refNoQuorumId, quorum, doubleQuorum, 0n));

  // 11. In referendum - equal YES and NO votes (tied)
  const refTiedId = proposalId++;
  const refTiedQueuedTime = now - 13 * DAY;
  const refTiedDequeuedTime = now - 9 * DAY;
  const refTiedQueuedBlock = getBlockNumber(refTiedQueuedTime);
  const refTiedDequeuedBlock = getBlockNumber(refTiedDequeuedTime);
  events.push(
    createEvent('ProposalQueued', refTiedId, Number(refTiedQueuedBlock), getTxHash(), {
      proposalId: refTiedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: refTiedQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', refTiedId, Number(refTiedDequeuedBlock), getTxHash(), {
      proposalId: refTiedId.toString(),
      timestamp: refTiedDequeuedTime.toString(),
    }),
  );
  proposals.push(
    createProposal(
      refTiedId,
      cgp++,
      ProposalStage.Referendum,
      refTiedQueuedTime,
      'Test Proposal 11: Referendum - Tied Votes',
      {
        queuedAt: toISOString(refTiedQueuedTime),
        queuedAtBlockNumber: refTiedQueuedBlock,
        dequeuedAt: toISOString(refTiedDequeuedTime),
        dequeuedAtBlockNumber: refTiedDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(refTiedId, quorum, quorum, 0n));

  // 12. In execution - not yet approved
  const execNoApprovalId = proposalId++;
  const execNoApprovalQueuedTime = now - 20 * DAY;
  const execNoApprovalDequeuedTime = now - 17 * DAY;
  const execNoApprovalQueuedBlock = getBlockNumber(execNoApprovalQueuedTime);
  const execNoApprovalDequeuedBlock = getBlockNumber(execNoApprovalDequeuedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      execNoApprovalId,
      Number(execNoApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: execNoApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: execNoApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      execNoApprovalId,
      Number(execNoApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: execNoApprovalId.toString(),
        timestamp: execNoApprovalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      execNoApprovalId,
      cgp++,
      ProposalStage.Execution,
      execNoApprovalQueuedTime,
      'Test Proposal 12: Execution - No Approval',
      {
        queuedAt: toISOString(execNoApprovalQueuedTime),
        queuedAtBlockNumber: execNoApprovalQueuedBlock,
        dequeuedAt: toISOString(execNoApprovalDequeuedTime),
        dequeuedAtBlockNumber: execNoApprovalDequeuedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(execNoApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 13. In execution - with partial approval (2 of 3 approvals)
  const execPartialApprovalId = proposalId++;
  const execPartialApprovalQueuedTime = now - 22 * DAY;
  const execPartialApprovalDequeuedTime = now - 19 * DAY;
  const execPartialApprovalQueuedBlock = getBlockNumber(execPartialApprovalQueuedTime);
  const execPartialApprovalDequeuedBlock = getBlockNumber(execPartialApprovalDequeuedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      execPartialApprovalId,
      Number(execPartialApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: execPartialApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: execPartialApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      execPartialApprovalId,
      Number(execPartialApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: execPartialApprovalId.toString(),
        timestamp: execPartialApprovalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      execPartialApprovalId,
      cgp++,
      ProposalStage.Execution,
      execPartialApprovalQueuedTime,
      'Test Proposal 13: Execution - Partial Approval',
      {
        queuedAt: toISOString(execPartialApprovalQueuedTime),
        queuedAtBlockNumber: execPartialApprovalQueuedBlock,
        dequeuedAt: toISOString(execPartialApprovalDequeuedTime),
        dequeuedAtBlockNumber: execPartialApprovalDequeuedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(execPartialApprovalId, doubleQuorum, quorum / BigInt(2), 0n));
  // Add 2 approvals (partial - not enough for ProposalApproved event)
  addApprovals(execPartialApprovalId, 2, execPartialApprovalDequeuedTime + 1 * DAY);

  // 14. In execution - with full approval
  const execFullApprovalId = proposalId++;
  const execFullApprovalQueuedTime = now - 25 * DAY;
  const execFullApprovalDequeuedTime = now - 22 * DAY;
  const execFullApprovalApprovedTime = now - 14 * DAY;
  const execFullApprovalQueuedBlock = getBlockNumber(execFullApprovalQueuedTime);
  const execFullApprovalDequeuedBlock = getBlockNumber(execFullApprovalDequeuedTime);
  const execFullApprovalApprovedBlock = getBlockNumber(execFullApprovalApprovedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      execFullApprovalId,
      Number(execFullApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: execFullApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: execFullApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      execFullApprovalId,
      Number(execFullApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: execFullApprovalId.toString(),
        timestamp: execFullApprovalDequeuedTime.toString(),
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalApproved',
      execFullApprovalId,
      Number(execFullApprovalApprovedBlock),
      getTxHash(),
      {
        proposalId: execFullApprovalId.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      execFullApprovalId,
      cgp++,
      ProposalStage.Execution,
      execFullApprovalQueuedTime,
      'Test Proposal 14: Execution - Full Approval',
      {
        queuedAt: toISOString(execFullApprovalQueuedTime),
        queuedAtBlockNumber: execFullApprovalQueuedBlock,
        dequeuedAt: toISOString(execFullApprovalDequeuedTime),
        dequeuedAtBlockNumber: execFullApprovalDequeuedBlock,
        approvedAt: toISOString(execFullApprovalApprovedTime),
        approvedAtBlockNumber: execFullApprovalApprovedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(execFullApprovalId, doubleQuorum, quorum / BigInt(2), 0n));
  // Add 3 approvals (fully approved)
  addApprovals(execFullApprovalId, 3, execFullApprovalDequeuedTime + 8 * DAY);

  // 15. Executed (successfully completed)
  const executedId = proposalId++;
  const executedQueuedTime = now - 30 * DAY;
  const executedDequeuedTime = now - 27 * DAY;
  const executedApprovedTime = now - 19 * DAY;
  const executedExecutedTime = now - 17 * DAY;
  const executedQueuedBlock = getBlockNumber(executedQueuedTime);
  const executedDequeuedBlock = getBlockNumber(executedDequeuedTime);
  const executedApprovedBlock = getBlockNumber(executedApprovedTime);
  const executedExecutedBlock = getBlockNumber(executedExecutedTime);
  events.push(
    createEvent('ProposalQueued', executedId, Number(executedQueuedBlock), getTxHash(), {
      proposalId: executedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: executedQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', executedId, Number(executedDequeuedBlock), getTxHash(), {
      proposalId: executedId.toString(),
      timestamp: executedDequeuedTime.toString(),
    }),
  );
  events.push(
    createEvent('ProposalApproved', executedId, Number(executedApprovedBlock), getTxHash(), {
      proposalId: executedId.toString(),
    }),
  );
  events.push(
    createEvent('ProposalExecuted', executedId, Number(executedExecutedBlock), getTxHash(), {
      proposalId: executedId.toString(),
    }),
  );
  proposals.push(
    createProposal(
      executedId,
      cgp++,
      ProposalStage.Executed,
      executedQueuedTime,
      'Test Proposal 15: Successfully Executed',
      {
        queuedAt: toISOString(executedQueuedTime),
        queuedAtBlockNumber: executedQueuedBlock,
        dequeuedAt: toISOString(executedDequeuedTime),
        dequeuedAtBlockNumber: executedDequeuedBlock,
        approvedAt: toISOString(executedApprovedTime),
        approvedAtBlockNumber: executedApprovedBlock,
        executedAtTimestamp: toISOString(executedExecutedTime),
        executedAtBlockNumber: executedExecutedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(executedId, doubleQuorum, quorum / BigInt(2), 0n));
  // All executed proposals need 3 approval confirmations - they happen before approved event
  addApprovals(executedId, 3, executedDequeuedTime + 8 * DAY);

  // 16. Expired from referendum - with full approval
  const expiredRefApprovedId = proposalId++;
  const expiredRefApprovedQueuedTime = now - 50 * DAY;
  const expiredRefApprovedDequeuedTime = now - 47 * DAY;
  const expiredRefApprovedApprovedTime = now - 40 * DAY;
  const expiredRefApprovedQueuedBlock = getBlockNumber(expiredRefApprovedQueuedTime);
  const expiredRefApprovedDequeuedBlock = getBlockNumber(expiredRefApprovedDequeuedTime);
  const expiredRefApprovedApprovedBlock = getBlockNumber(expiredRefApprovedApprovedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      expiredRefApprovedId,
      Number(expiredRefApprovedQueuedBlock),
      getTxHash(),
      {
        proposalId: expiredRefApprovedId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: expiredRefApprovedQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      expiredRefApprovedId,
      Number(expiredRefApprovedDequeuedBlock),
      getTxHash(),
      {
        proposalId: expiredRefApprovedId.toString(),
        timestamp: expiredRefApprovedDequeuedTime.toString(),
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalApproved',
      expiredRefApprovedId,
      Number(expiredRefApprovedApprovedBlock),
      getTxHash(),
      {
        proposalId: expiredRefApprovedId.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      expiredRefApprovedId,
      cgp++,
      ProposalStage.Expiration,
      expiredRefApprovedQueuedTime,
      'Test Proposal 16: Expired From Referendum - Approved',
      {
        queuedAt: toISOString(expiredRefApprovedQueuedTime),
        queuedAtBlockNumber: expiredRefApprovedQueuedBlock,
        dequeuedAt: toISOString(expiredRefApprovedDequeuedTime),
        dequeuedAtBlockNumber: expiredRefApprovedDequeuedBlock,
        approvedAt: toISOString(expiredRefApprovedApprovedTime),
        approvedAtBlockNumber: expiredRefApprovedApprovedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(expiredRefApprovedId, doubleQuorum, quorum / BigInt(2), 0n));
  addApprovals(expiredRefApprovedId, 3, expiredRefApprovedDequeuedTime + 7 * DAY);

  // 17. Expired from referendum - never approved
  const expiredRefNoApprovalId = proposalId++;
  const expiredRefNoApprovalQueuedTime = now - 52 * DAY;
  const expiredRefNoApprovalDequeuedTime = now - 49 * DAY;
  const expiredRefNoApprovalQueuedBlock = getBlockNumber(expiredRefNoApprovalQueuedTime);
  const expiredRefNoApprovalDequeuedBlock = getBlockNumber(expiredRefNoApprovalDequeuedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      expiredRefNoApprovalId,
      Number(expiredRefNoApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: expiredRefNoApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: expiredRefNoApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      expiredRefNoApprovalId,
      Number(expiredRefNoApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: expiredRefNoApprovalId.toString(),
        timestamp: expiredRefNoApprovalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      expiredRefNoApprovalId,
      cgp++,
      ProposalStage.Expiration,
      expiredRefNoApprovalQueuedTime,
      'Test Proposal 17: Expired From Referendum - No Approval',
      {
        queuedAt: toISOString(expiredRefNoApprovalQueuedTime),
        queuedAtBlockNumber: expiredRefNoApprovalQueuedBlock,
        dequeuedAt: toISOString(expiredRefNoApprovalDequeuedTime),
        dequeuedAtBlockNumber: expiredRefNoApprovalDequeuedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(expiredRefNoApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 18. Expired from execution - with full approval
  const expiredExecApprovedId = proposalId++;
  const expiredExecApprovedQueuedTime = now - 55 * DAY;
  const expiredExecApprovedDequeuedTime = now - 52 * DAY;
  const expiredExecApprovedApprovedTime = now - 44 * DAY;
  const expiredExecApprovedQueuedBlock = getBlockNumber(expiredExecApprovedQueuedTime);
  const expiredExecApprovedDequeuedBlock = getBlockNumber(expiredExecApprovedDequeuedTime);
  const expiredExecApprovedApprovedBlock = getBlockNumber(expiredExecApprovedApprovedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      expiredExecApprovedId,
      Number(expiredExecApprovedQueuedBlock),
      getTxHash(),
      {
        proposalId: expiredExecApprovedId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: expiredExecApprovedQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      expiredExecApprovedId,
      Number(expiredExecApprovedDequeuedBlock),
      getTxHash(),
      {
        proposalId: expiredExecApprovedId.toString(),
        timestamp: expiredExecApprovedDequeuedTime.toString(),
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalApproved',
      expiredExecApprovedId,
      Number(expiredExecApprovedApprovedBlock),
      getTxHash(),
      {
        proposalId: expiredExecApprovedId.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      expiredExecApprovedId,
      cgp++,
      ProposalStage.Expiration,
      expiredExecApprovedQueuedTime,
      'Test Proposal 18: Expired From Execution - Approved',
      {
        queuedAt: toISOString(expiredExecApprovedQueuedTime),
        queuedAtBlockNumber: expiredExecApprovedQueuedBlock,
        dequeuedAt: toISOString(expiredExecApprovedDequeuedTime),
        dequeuedAtBlockNumber: expiredExecApprovedDequeuedBlock,
        approvedAt: toISOString(expiredExecApprovedApprovedTime),
        approvedAtBlockNumber: expiredExecApprovedApprovedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(expiredExecApprovedId, doubleQuorum, quorum / BigInt(2), 0n));
  addApprovals(expiredExecApprovedId, 3, expiredExecApprovedDequeuedTime + 8 * DAY);

  // 19. Expired from execution - never approved
  const expiredExecNoApprovalId = proposalId++;
  const expiredExecNoApprovalQueuedTime = now - 57 * DAY;
  const expiredExecNoApprovalDequeuedTime = now - 54 * DAY;
  const expiredExecNoApprovalQueuedBlock = getBlockNumber(expiredExecNoApprovalQueuedTime);
  const expiredExecNoApprovalDequeuedBlock = getBlockNumber(expiredExecNoApprovalDequeuedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      expiredExecNoApprovalId,
      Number(expiredExecNoApprovalQueuedBlock),
      getTxHash(),
      {
        proposalId: expiredExecNoApprovalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: expiredExecNoApprovalQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      expiredExecNoApprovalId,
      Number(expiredExecNoApprovalDequeuedBlock),
      getTxHash(),
      {
        proposalId: expiredExecNoApprovalId.toString(),
        timestamp: expiredExecNoApprovalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      expiredExecNoApprovalId,
      cgp++,
      ProposalStage.Expiration,
      expiredExecNoApprovalQueuedTime,
      'Test Proposal 19: Expired From Execution - No Approval',
      {
        queuedAt: toISOString(expiredExecNoApprovalQueuedTime),
        queuedAtBlockNumber: expiredExecNoApprovalQueuedBlock,
        dequeuedAt: toISOString(expiredExecNoApprovalDequeuedTime),
        dequeuedAtBlockNumber: expiredExecNoApprovalDequeuedBlock,
        quorumVotesRequired: quorum,
      },
    ),
  );
  votes.push(...createVotes(expiredExecNoApprovalId, doubleQuorum, quorum / BigInt(2), 0n));

  // 20. Withdrawn from queue
  const withdrawnQueueId = proposalId++;
  const withdrawnQueueTime = now - 8 * DAY;
  const withdrawnQueueBlock = getBlockNumber(withdrawnQueueTime);
  events.push(
    createEvent('ProposalQueued', withdrawnQueueId, Number(withdrawnQueueBlock), getTxHash(), {
      proposalId: withdrawnQueueId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: withdrawnQueueTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  proposals.push(
    createProposal(
      withdrawnQueueId,
      cgp++,
      ProposalStage.Withdrawn,
      withdrawnQueueTime,
      'Test Proposal 20: Withdrawn From Queue',
      {
        queuedAt: toISOString(withdrawnQueueTime),
        queuedAtBlockNumber: withdrawnQueueBlock,
      },
    ),
  );

  // 23. Rejected (expired with more NO than YES)
  const rejectedId = proposalId++;
  const rejectedQueuedTime = now - 60 * DAY;
  const rejectedDequeuedTime = now - 57 * DAY;
  const rejectedQueuedBlock = getBlockNumber(rejectedQueuedTime);
  const rejectedDequeuedBlock = getBlockNumber(rejectedDequeuedTime);
  events.push(
    createEvent('ProposalQueued', rejectedId, Number(rejectedQueuedBlock), getTxHash(), {
      proposalId: rejectedId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: rejectedQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent('ProposalDequeued', rejectedId, Number(rejectedDequeuedBlock), getTxHash(), {
      proposalId: rejectedId.toString(),
      timestamp: rejectedDequeuedTime.toString(),
    }),
  );
  proposals.push(
    createProposal(
      rejectedId,
      cgp++,
      ProposalStage.Rejected,
      rejectedQueuedTime,
      'Test Proposal 23: Rejected (No > Yes)',
      {
        queuedAt: toISOString(rejectedQueuedTime),
        queuedAtBlockNumber: rejectedQueuedBlock,
        dequeuedAt: toISOString(rejectedDequeuedTime),
        dequeuedAtBlockNumber: rejectedDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(rejectedId, quorum, doubleQuorum, 0n));

  // 24. Proposal with revoked upvotes
  const revokedUpvotesId = proposalId++;
  const revokedUpvotesTime = now - 4 * DAY;
  const revokedUpvotesBlock = getBlockNumber(revokedUpvotesTime);
  events.push(
    createEvent('ProposalQueued', revokedUpvotesId, Number(revokedUpvotesBlock), getTxHash(), {
      proposalId: revokedUpvotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: revokedUpvotesTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent(
      'ProposalUpvoted',
      revokedUpvotesId,
      Number(getBlockNumber(revokedUpvotesTime + 3600)),
      getTxHash(),
      {
        // 1 hour after queued
        proposalId: revokedUpvotesId.toString(),
        account: '0x2234567890123456789012345678901234567890',
        upvotes: '5000000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalUpvoteRevoked',
      revokedUpvotesId,
      Number(getBlockNumber(revokedUpvotesTime + 7200)),
      getTxHash(),
      {
        // 2 hours after queued
        proposalId: revokedUpvotesId.toString(),
        account: '0x2234567890123456789012345678901234567890',
        upvotes: '5000000000000000000000',
      },
    ),
  );
  proposals.push(
    createProposal(
      revokedUpvotesId,
      cgp++,
      ProposalStage.Queued,
      revokedUpvotesTime,
      'Test Proposal 24: With Revoked Upvotes',
      {
        queuedAt: toISOString(revokedUpvotesTime),
        queuedAtBlockNumber: revokedUpvotesBlock,
      },
    ),
  );

  // 25. Proposal with revoked votes
  const revokedVotesId = proposalId++;
  const revokedVotesQueuedTime = now - 16 * DAY;
  const revokedVotesDequeuedTime = now - 13 * DAY;
  const revokedVotesQueuedBlock = getBlockNumber(revokedVotesQueuedTime);
  const revokedVotesDequeuedBlock = getBlockNumber(revokedVotesDequeuedTime);
  events.push(
    createEvent('ProposalQueued', revokedVotesId, Number(revokedVotesQueuedBlock), getTxHash(), {
      proposalId: revokedVotesId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: revokedVotesQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      revokedVotesId,
      Number(revokedVotesDequeuedBlock),
      getTxHash(),
      {
        proposalId: revokedVotesId.toString(),
        timestamp: revokedVotesDequeuedTime.toString(),
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalVotedV2',
      revokedVotesId,
      Number(getBlockNumber(revokedVotesDequeuedTime + 3600)),
      getTxHash(),
      {
        // 1 hour after dequeued
        proposalId: revokedVotesId.toString(),
        account: '0x3234567890123456789012345678901234567890',
        value: '1',
        weight: '1000000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalVoteRevokedV2',
      revokedVotesId,
      Number(getBlockNumber(revokedVotesDequeuedTime + 7200)),
      getTxHash(),
      {
        // 2 hours after dequeued
        proposalId: revokedVotesId.toString(),
        account: '0x3234567890123456789012345678901234567890',
        value: '1',
        weight: '1000000000000000000000',
      },
    ),
  );
  proposals.push(
    createProposal(
      revokedVotesId,
      cgp++,
      ProposalStage.Referendum,
      revokedVotesQueuedTime,
      'Test Proposal 25: With Revoked Votes',
      {
        queuedAt: toISOString(revokedVotesQueuedTime),
        queuedAtBlockNumber: revokedVotesQueuedBlock,
        dequeuedAt: toISOString(revokedVotesDequeuedTime),
        dequeuedAtBlockNumber: revokedVotesDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(revokedVotesId, quorum, halfQuorum, 0n));

  // 26. Re-submitted proposal (has pastId)
  const originalProposalId = proposalId++;
  const originalQueuedTime = now - 70 * DAY;
  const originalDequeuedTime = now - 67 * DAY;
  const originalQueuedBlock = getBlockNumber(originalQueuedTime);
  const originalDequeuedBlock = getBlockNumber(originalDequeuedTime);
  events.push(
    createEvent('ProposalQueued', originalProposalId, Number(originalQueuedBlock), getTxHash(), {
      proposalId: originalProposalId.toString(),
      proposer: '0x1234567890123456789012345678901234567890',
      transactionCount: '3',
      timestamp: originalQueuedTime.toString(),
      deposit: '100000000000000000000',
    }),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      originalProposalId,
      Number(originalDequeuedBlock),
      getTxHash(),
      {
        proposalId: originalProposalId.toString(),
        timestamp: originalDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      originalProposalId,
      cgp,
      ProposalStage.Rejected,
      originalQueuedTime,
      'Test Proposal 26a: Original (Rejected)',
      {
        queuedAt: toISOString(originalQueuedTime),
        queuedAtBlockNumber: originalQueuedBlock,
        dequeuedAt: toISOString(originalDequeuedTime),
        dequeuedAtBlockNumber: originalDequeuedBlock,
      },
    ),
  );
  votes.push(...createVotes(originalProposalId, quorum, doubleQuorum, 0n));

  const resubmittedProposalId = proposalId++;
  const resubmittedQueuedTime = now - 17 * DAY;
  const resubmittedDequeuedTime = now - 14 * DAY;
  const resubmittedQueuedBlock = getBlockNumber(resubmittedQueuedTime);
  const resubmittedDequeuedBlock = getBlockNumber(resubmittedDequeuedTime);
  events.push(
    createEvent(
      'ProposalQueued',
      resubmittedProposalId,
      Number(resubmittedQueuedBlock),
      getTxHash(),
      {
        proposalId: resubmittedProposalId.toString(),
        proposer: '0x1234567890123456789012345678901234567890',
        transactionCount: '3',
        timestamp: resubmittedQueuedTime.toString(),
        deposit: '100000000000000000000',
      },
    ),
  );
  events.push(
    createEvent(
      'ProposalDequeued',
      resubmittedProposalId,
      Number(resubmittedDequeuedBlock),
      getTxHash(),
      {
        proposalId: resubmittedProposalId.toString(),
        timestamp: resubmittedDequeuedTime.toString(),
      },
    ),
  );
  proposals.push(
    createProposal(
      resubmittedProposalId,
      cgp++,
      ProposalStage.Referendum,
      resubmittedQueuedTime,
      'Test Proposal 26b: Re-submitted (Active)',
      {
        queuedAt: toISOString(resubmittedQueuedTime),
        queuedAtBlockNumber: resubmittedQueuedBlock,
        dequeuedAt: toISOString(resubmittedDequeuedTime),
        dequeuedAtBlockNumber: resubmittedDequeuedBlock,
        pastId: originalProposalId, // pastId links to original
      },
    ),
  );
  votes.push(...createVotes(resubmittedProposalId, doubleQuorum, quorum, 0n));

  console.log(
    `📊 Generated ${proposals.length} proposals, ${events.length} events, ${votes.length} vote records`,
  );

  // Clean up existing test data before inserting fresh data
  console.log(
    `🧹 Cleaning up existing test data (proposal IDs ${TEST_PROPOSAL_ID_START}-${TEST_PROPOSAL_ID_END - 1})...`,
  );

  // Delete events for test proposals by checking topics[2] (PostgreSQL arrays are 1-indexed)
  // Events store IDs in topics as 64-character hex strings:
  // - Proposal events (ProposalQueued, ProposalDequeued, etc.): Store proposalId in topics[2]
  // - Confirmation events (multisig approvals): Store multisigTxId in topics[2]
  //   where multisigTxId = proposalId + 10000 (see addApprovals helper at line 270)
  await database.delete(eventsTable).where(
    sql`${eventsTable.chainId} = ${celo.id} AND (
        (${eventsTable.topics}[2]::text >= ${TEST_PROPOSAL_ID_START_HEX}
         AND ${eventsTable.topics}[2]::text < ${TEST_PROPOSAL_ID_END_HEX})
        OR
        (${eventsTable.topics}[2]::text >= ${TEST_MULTISIG_TX_ID_START_HEX}
         AND ${eventsTable.topics}[2]::text < ${TEST_MULTISIG_TX_ID_END_HEX})
      )`,
  );

  // Delete proposals (this will cascade to votes and approvals due to foreign key constraints)
  await database
    .delete(proposalsTable)
    .where(
      sql`${proposalsTable.id} >= ${TEST_PROPOSAL_ID_START} AND ${proposalsTable.id} < ${TEST_PROPOSAL_ID_END} AND ${proposalsTable.chainId} = ${celo.id}`,
    );
  console.log('✅ Cleaned up old test data');
  console.log('');

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

  console.log('💾 Inserting approvals...');
  if (approvals.length > 0) {
    await database.insert(approvalsTable).values(approvals).onConflictDoNothing();
    console.log(`✅ Inserted ${approvals.length} approval records`);
  }

  console.log('');
  console.log('🎉 Test data population complete!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   - Proposals: ${proposals.length}`);
  console.log(`   - Events: ${events.length}`);
  console.log(`   - Vote records: ${votes.length}`);
  console.log(`   - Approval records: ${approvals.length}`);
  console.log(`   - Proposal ID range: ${TEST_PROPOSAL_ID_START}-${proposalId - 1}`);
  console.log(`   - CGP range: ${TEST_CGP_START}-${cgp - 1}`);
  console.log(
    `   - Multisig TX ID range: ${TEST_MULTISIG_TX_ID_START}-${TEST_MULTISIG_TX_ID_START + proposals.length - 1}`,
  );
  console.log('');
  console.log('✨ All 26 proposal states have been created!');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error populating test data:', error);
  process.exit(1);
});
