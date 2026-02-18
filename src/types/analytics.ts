// Type-safe analytics event system

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
