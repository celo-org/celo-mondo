// Timing helpers
export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export enum StaleTime {
  Shortest = SECOND,
  Short = MINUTE,
  Default = 10 * MINUTE,
}
export enum GCTime {
  Shortest = 2 * StaleTime.Shortest,
  Short = 2 * StaleTime.Short,
  Default = 2 * StaleTime.Default,
}
export enum CacheKeys {
  AllProposals = 'AllProposals',
  AllVotes = 'AllVotes',
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const DEFAULT_DISPLAY_DECIMALS = 2;
export const DEFAULT_TOKEN_DECIMALS = 18;
export const AVG_BLOCK_TIMES_MS = 5 * SECOND; // 5 SECONDs
export const EPOCH_DURATION_MS = DAY; // 1 day
export const BALANCE_REFRESH_INTERVAL = 5 * SECOND; // 5 seconds

// Locking
export const MIN_REMAINING_BALANCE = 10000000000000000n; // 0.01 CELO

// Staking
export const MIN_GROUP_SCORE_FOR_RANDOM = 0.9;
export const MIN_INCREMENTAL_VOTE_AMOUNT = 10000000000000000n; // 0.01 CELO
export const MAX_NUM_ELECTABLE_VALIDATORS = 110;
export const MAX_NUM_GROUPS_VOTED_FOR = 10;

// Governance
export const PROPOSAL_V1_MAX_ID = 110; // Proposals before this use old vote events
export const QUEUED_STAGE_EXPIRY_TIME = 28 * DAY; // 4 weeks
export const DEQUEUE_FREQUENCY = DAY; // 1 day
export const APPROVAL_STAGE_EXPIRY_TIME = DAY; // 1 day
export const REFERENDUM_STAGE_EXPIRY_TIME = 7 * DAY; // 7 days
export const EXECUTION_STAGE_EXPIRY_TIME = 3 * DAY; // 3 days

// Delegation
export const MAX_NUM_DELEGATEES = 10;

// Wallets
export const WALLET_CONNECT_CONNECTOR_ID = 'walletConnect';

// stCELO
export const ST_CELO_API_URL =
  'https://us-central1-staked-celo-bot.cloudfunctions.net/mainnet-functions';
