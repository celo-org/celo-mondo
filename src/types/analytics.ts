// Type-safe analytics event system

import { BRIDGES } from 'src/config/bridges';
import { DelegateActionType } from 'src/features/delegation/types';
import { VoteType } from 'src/features/governance/types';
import { LockActionType } from 'src/features/locking/types';
import { StakeActionType } from 'src/features/staking/types';
import { z } from 'zod';

export interface BridgeClickedProperties {
  bridgeId: string;
}

// Wallet events
export interface WalletConnectedProperties {
  walletType?: string;
}

export interface WalletDisconnectedProperties {}

// Transaction completion events
export interface StakeCompletedProperties {
  action: string;
  amount: number;
  group?: string;
}

export interface LockCompletedProperties {
  action: string;
  amount: number;
}

export interface VoteCompletedProperties {
  voteType: string;
  proposalId: number;
}

export interface UpvoteCompletedProperties {
  proposalId: number;
}

export interface DelegateCompletedProperties {
  action: string;
  percent: number;
}

export interface AccountCreatedProperties {}

// Navigation events
export interface NavClickedProperties {
  item: string;
}

export interface ModeToggledProperties {
  mode: string;
}

// Proposal events
export interface ProposalViewedProperties {
  proposalId: string;
  stage?: string;
}

export interface ProposalFilterChangedProperties {
  filter: string;
}

export interface VoteButtonClickedProperties {
  proposalId: number;
  voteType: string;
}

export interface UpvoteButtonClickedProperties {
  proposalId: number;
}

// Validator/Staking events
export interface ValidatorGroupViewedProperties {
  groupAddress: string;
  groupName?: string;
}

export interface ValidatorFilterChangedProperties {
  filter: string;
}

export interface StakeButtonClickedProperties {
  groupAddress: string;
}

export interface StakeMenuClickedProperties {
  action: string;
  groupAddress: string;
}

// Delegate events
export interface DelegateeViewedProperties {
  delegateeAddress: string;
  delegateeName?: string;
}

export interface DelegateButtonClickedProperties {
  delegateeAddress?: string;
}

export interface RegisterDelegateeClickedProperties {}

// External link events
export interface ExternalLinkClickedProperties {
  url: string;
  context?: string;
}

// Analytics event mapping - ensures type safety between event names and their properties
export interface AnalyticsEventMap {
  bridge_clicked: BridgeClickedProperties;

  // Wallet events
  wallet_connected: WalletConnectedProperties;
  wallet_disconnected: WalletDisconnectedProperties;

  // Transaction completion events
  stake_completed: StakeCompletedProperties;
  lock_completed: LockCompletedProperties;
  vote_completed: VoteCompletedProperties;
  upvote_completed: UpvoteCompletedProperties;
  delegate_completed: DelegateCompletedProperties;
  account_created: AccountCreatedProperties;

  // Navigation events
  nav_clicked: NavClickedProperties;
  mode_toggled: ModeToggledProperties;

  // Proposal events
  proposal_viewed: ProposalViewedProperties;
  proposal_filter_changed: ProposalFilterChangedProperties;
  vote_button_clicked: VoteButtonClickedProperties;
  upvote_button_clicked: UpvoteButtonClickedProperties;

  // Validator/Staking events
  validator_group_viewed: ValidatorGroupViewedProperties;
  validator_filter_changed: ValidatorFilterChangedProperties;
  stake_button_clicked: StakeButtonClickedProperties;
  stake_menu_clicked: StakeMenuClickedProperties;

  // Delegate events
  delegatee_viewed: DelegateeViewedProperties;
  delegate_button_clicked: DelegateButtonClickedProperties;
  register_delegatee_clicked: RegisterDelegateeClickedProperties;

  // External link events
  external_link_clicked: ExternalLinkClickedProperties;
}

// Extract valid event names
export type AnalyticsEventName = keyof AnalyticsEventMap;

// Type-safe event payload
export interface AnalyticsEventPayload<T extends AnalyticsEventName = AnalyticsEventName> {
  eventName: T;
  properties: AnalyticsEventMap[T];
  sessionId?: string;
}

// Type guard to validate event payload
export function isValidAnalyticsEvent<T extends AnalyticsEventName>(
  eventName: T,
  properties: unknown,
): properties is AnalyticsEventMap[T] {
  if (eventName === 'bridge_clicked') {
    const props = properties as BridgeClickedProperties;
    return typeof props.bridgeId === 'string';
  }

  if (eventName === 'wallet_connected') {
    const props = properties as WalletConnectedProperties;
    return props.walletType === undefined || typeof props.walletType === 'string';
  }

  if (eventName === 'wallet_disconnected') {
    return typeof properties === 'object' && properties !== null;
  }

  if (eventName === 'stake_completed') {
    const props = properties as StakeCompletedProperties;
    return (
      typeof props.action === 'string' &&
      typeof props.amount === 'number' &&
      (props.group === undefined || typeof props.group === 'string')
    );
  }

  if (eventName === 'lock_completed') {
    const props = properties as LockCompletedProperties;
    return typeof props.action === 'string' && typeof props.amount === 'number';
  }

  if (eventName === 'vote_completed') {
    const props = properties as VoteCompletedProperties;
    return typeof props.voteType === 'string' && typeof props.proposalId === 'number';
  }

  if (eventName === 'upvote_completed') {
    const props = properties as UpvoteCompletedProperties;
    return typeof props.proposalId === 'number';
  }

  if (eventName === 'delegate_completed') {
    const props = properties as DelegateCompletedProperties;
    return typeof props.action === 'string' && typeof props.percent === 'number';
  }

  if (eventName === 'account_created') {
    return typeof properties === 'object' && properties !== null;
  }

  if (eventName === 'nav_clicked') {
    const props = properties as NavClickedProperties;
    return typeof props.item === 'string';
  }

  if (eventName === 'mode_toggled') {
    const props = properties as ModeToggledProperties;
    return typeof props.mode === 'string';
  }

  if (eventName === 'proposal_viewed') {
    const props = properties as ProposalViewedProperties;
    return (
      typeof props.proposalId === 'string' &&
      (props.stage === undefined || typeof props.stage === 'string')
    );
  }

  if (eventName === 'proposal_filter_changed') {
    const props = properties as ProposalFilterChangedProperties;
    return typeof props.filter === 'string';
  }

  if (eventName === 'vote_button_clicked') {
    const props = properties as VoteButtonClickedProperties;
    return typeof props.proposalId === 'number' && typeof props.voteType === 'string';
  }

  if (eventName === 'upvote_button_clicked') {
    const props = properties as UpvoteButtonClickedProperties;
    return typeof props.proposalId === 'number';
  }

  if (eventName === 'validator_group_viewed') {
    const props = properties as ValidatorGroupViewedProperties;
    return (
      typeof props.groupAddress === 'string' &&
      (props.groupName === undefined || typeof props.groupName === 'string')
    );
  }

  if (eventName === 'validator_filter_changed') {
    const props = properties as ValidatorFilterChangedProperties;
    return typeof props.filter === 'string';
  }

  if (eventName === 'stake_button_clicked') {
    const props = properties as StakeButtonClickedProperties;
    return typeof props.groupAddress === 'string';
  }

  if (eventName === 'stake_menu_clicked') {
    const props = properties as StakeMenuClickedProperties;
    return typeof props.action === 'string' && typeof props.groupAddress === 'string';
  }

  if (eventName === 'delegatee_viewed') {
    const props = properties as DelegateeViewedProperties;
    return (
      typeof props.delegateeAddress === 'string' &&
      (props.delegateeName === undefined || typeof props.delegateeName === 'string')
    );
  }

  if (eventName === 'delegate_button_clicked') {
    const props = properties as DelegateButtonClickedProperties;
    return props.delegateeAddress === undefined || typeof props.delegateeAddress === 'string';
  }

  if (eventName === 'register_delegatee_clicked') {
    return typeof properties === 'object' && properties !== null;
  }

  if (eventName === 'external_link_clicked') {
    const props = properties as ExternalLinkClickedProperties;
    return (
      typeof props.url === 'string' &&
      (props.context === undefined || typeof props.context === 'string')
    );
  }

  return false;
}

// Extract valid bridge IDs from config
const VALID_BRIDGE_IDS = BRIDGES.map((bridge) => bridge.id);

// Zod schemas for server-side validation with precise constraints from codebase
export const BridgeClickedPropertiesSchema = z
  .object({
    bridgeId: z.enum(VALID_BRIDGE_IDS as [string, ...string[]]),
  })
  .strict();

export const WalletConnectedPropertiesSchema = z
  .object({
    walletType: z.string().min(1).max(50).optional(),
  })
  .strict();

export const WalletDisconnectedPropertiesSchema = z.object({}).strict();

export const StakeCompletedPropertiesSchema = z
  .object({
    action: z.nativeEnum(StakeActionType),
    amount: z.number().min(0).finite(),
    group: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid EVM address')
      .optional(),
  })
  .strict();

export const LockCompletedPropertiesSchema = z
  .object({
    action: z.nativeEnum(LockActionType),
    amount: z.number().min(0).finite(),
  })
  .strict();

export const VoteCompletedPropertiesSchema = z
  .object({
    voteType: z.nativeEnum(VoteType),
    proposalId: z.number().int().min(1),
  })
  .strict();

export const UpvoteCompletedPropertiesSchema = z
  .object({
    proposalId: z.number().int().min(0),
  })
  .strict();

export const DelegateCompletedPropertiesSchema = z
  .object({
    action: z.nativeEnum(DelegateActionType),
    percent: z.number().min(0).max(100).finite(),
  })
  .strict();

export const AccountCreatedPropertiesSchema = z.object({}).strict();

export const NavClickedPropertiesSchema = z
  .object({
    item: z.string().min(1).max(100),
  })
  .strict();

export const ModeToggledPropertiesSchema = z
  .object({
    mode: z.enum(['CELO', 'stCELO']),
  })
  .strict();

export const ProposalViewedPropertiesSchema = z
  .object({
    proposalId: z.string().min(1).max(100),
    stage: z.string().min(1).max(50).optional(),
  })
  .strict();

export const ProposalFilterChangedPropertiesSchema = z
  .object({
    filter: z.string().min(1).max(100),
  })
  .strict();

export const VoteButtonClickedPropertiesSchema = z
  .object({
    proposalId: z.number().int().min(0),
    voteType: z.nativeEnum(VoteType),
  })
  .strict();

export const UpvoteButtonClickedPropertiesSchema = z
  .object({
    proposalId: z.number().int().min(0),
  })
  .strict();

export const ValidatorGroupViewedPropertiesSchema = z
  .object({
    groupAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid EVM address'),
    groupName: z.string().min(1).max(200).optional(),
  })
  .strict();

export const ValidatorFilterChangedPropertiesSchema = z
  .object({
    filter: z.string().min(1).max(100),
  })
  .strict();

export const StakeButtonClickedPropertiesSchema = z
  .object({
    groupAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid EVM address'),
  })
  .strict();

export const StakeMenuClickedPropertiesSchema = z
  .object({
    action: z.nativeEnum(StakeActionType),
    groupAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid EVM address'),
  })
  .strict();

export const DelegateeViewedPropertiesSchema = z
  .object({
    delegateeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid EVM address'),
    delegateeName: z.string().min(1).max(200).optional(),
  })
  .strict();

export const DelegateButtonClickedPropertiesSchema = z
  .object({
    delegateeAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be valid EVM address')
      .optional(),
  })
  .strict();

export const RegisterDelegateeClickedPropertiesSchema = z.object({}).strict();

export const ExternalLinkClickedPropertiesSchema = z
  .object({
    url: z.string().url().max(2000),
    context: z.enum(['proposal', 'cgp']).optional(),
  })
  .strict();

// Map of event names to their Zod schemas
export const AnalyticsEventSchemaMap = {
  bridge_clicked: BridgeClickedPropertiesSchema,
  wallet_connected: WalletConnectedPropertiesSchema,
  wallet_disconnected: WalletDisconnectedPropertiesSchema,
  stake_completed: StakeCompletedPropertiesSchema,
  lock_completed: LockCompletedPropertiesSchema,
  vote_completed: VoteCompletedPropertiesSchema,
  upvote_completed: UpvoteCompletedPropertiesSchema,
  delegate_completed: DelegateCompletedPropertiesSchema,
  account_created: AccountCreatedPropertiesSchema,
  nav_clicked: NavClickedPropertiesSchema,
  mode_toggled: ModeToggledPropertiesSchema,
  proposal_viewed: ProposalViewedPropertiesSchema,
  proposal_filter_changed: ProposalFilterChangedPropertiesSchema,
  vote_button_clicked: VoteButtonClickedPropertiesSchema,
  upvote_button_clicked: UpvoteButtonClickedPropertiesSchema,
  validator_group_viewed: ValidatorGroupViewedPropertiesSchema,
  validator_filter_changed: ValidatorFilterChangedPropertiesSchema,
  stake_button_clicked: StakeButtonClickedPropertiesSchema,
  stake_menu_clicked: StakeMenuClickedPropertiesSchema,
  delegatee_viewed: DelegateeViewedPropertiesSchema,
  delegate_button_clicked: DelegateButtonClickedPropertiesSchema,
  register_delegatee_clicked: RegisterDelegateeClickedPropertiesSchema,
  external_link_clicked: ExternalLinkClickedPropertiesSchema,
} as const;

// Server-side validation function using Zod
export function validateAnalyticsEvent(
  eventName: AnalyticsEventName,
  properties: unknown,
): { success: boolean; error?: string } {
  const schema = AnalyticsEventSchemaMap[eventName];
  if (!schema) {
    return { success: false, error: `Unknown event type: ${eventName}` };
  }

  const result = schema.safeParse(properties);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid properties for event ${eventName}: ${result.error.message}`,
    };
  }

  return { success: true };
}
