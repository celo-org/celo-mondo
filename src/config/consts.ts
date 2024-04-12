export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const DEFAULT_DISPLAY_DECIMALS = 2;
export const DEFAULT_TOKEN_DECIMALS = 18;
export const AVG_BLOCK_TIMES_MS = 5_000; // 5 seconds
export const EPOCH_DURATION_MS = 86_400_000; // 1 day
export const BALANCE_REFRESH_INTERVAL = 5_000; // 5 seconds

// Locking
export const MIN_REMAINING_BALANCE = 10000000000000000n; // 0.01 CELO

// Staking
export const MIN_GROUP_SCORE_FOR_RANDOM = 90;
export const MIN_INCREMENTAL_VOTE_AMOUNT = 10000000000000000n; // 0.01 CELO
export const MAX_NUM_ELECTABLE_VALIDATORS = 110;
export const MAX_NUM_GROUPS_VOTED_FOR = 10;

// Governance
export const PROPOSAL_V1_MAX_ID = 110; // Proposals before this use old vote events
export const QUEUED_STAGE_EXPIRY_TIME = 2_419_200_000; // 4 weeks
export const DEQUEUE_FREQUENCY = 86_400_000; // 1 day
export const APPROVAL_STAGE_EXPIRY_TIME = 86_400_000; // 1 day
export const REFERENDUM_STAGE_EXPIRY_TIME = 604_800_000; // 7 days
export const EXECUTION_STAGE_EXPIRY_TIME = 259_200_000; // 3 days

// Delegation
export const MAX_NUM_DELEGATEES = 10;
