import { track } from '@vercel/analytics';

/**
 * Safe wrapper around Vercel Analytics track() that never throws.
 * Analytics should never crash the UI.
 */
function safeTrack(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(name, properties);
  } catch (error) {
    // Log but don't crash - analytics errors should never affect the UI
    // eslint-disable-next-line no-console
    console.warn('[Analytics] Failed to track event:', name, error);
  }
}

export const analytics = {
  // Wallet events
  walletConnected: (props?: { walletType?: string }) => safeTrack('Wallet Connected', props),
  walletDisconnected: () => safeTrack('Wallet Disconnected'),

  // Transaction success events
  stakeCompleted: (props: { action: string; amount: number; group?: string }) =>
    safeTrack('Stake Completed', props),
  lockCompleted: (props: { action: string; amount: number }) => safeTrack('Lock Completed', props),
  voteCompleted: (props: { voteType: string; proposalId: number }) =>
    safeTrack('Vote Completed', props),
  upvoteCompleted: (props: { proposalId: number }) => safeTrack('Upvote Completed', props),
  delegateCompleted: (props: { action: string; percent: number }) =>
    safeTrack('Delegate Completed', props),
  accountCreated: () => safeTrack('Account Created'),

  // Navigation events
  navClicked: (props: { item: string }) => safeTrack('Nav Clicked', props),
  modeToggled: (props: { mode: string }) => safeTrack('Mode Toggled', props),

  // Proposal events
  proposalViewed: (props: { proposalId: string; stage?: string }) =>
    safeTrack('Proposal Viewed', props),
  proposalFilterChanged: (props: { filter: string }) => safeTrack('Proposal Filter Changed', props),
  voteButtonClicked: (props: { proposalId: number; voteType: string }) =>
    safeTrack('Vote Button Clicked', props),
  upvoteButtonClicked: (props: { proposalId: number }) => safeTrack('Upvote Button Clicked', props),

  // Validator/Staking events
  validatorGroupViewed: (props: { groupAddress: string; groupName?: string }) =>
    safeTrack('Validator Group Viewed', props),
  validatorFilterChanged: (props: { filter: string }) =>
    safeTrack('Validator Filter Changed', props),
  stakeButtonClicked: (props: { groupAddress: string }) => safeTrack('Stake Button Clicked', props),
  stakeMenuClicked: (props: { action: string; groupAddress: string }) =>
    safeTrack('Stake Menu Clicked', props),

  // Delegate events
  delegateeViewed: (props: { delegateeAddress: string; delegateeName?: string }) =>
    safeTrack('Delegatee Viewed', props),
  delegateButtonClicked: (props?: { delegateeAddress?: string }) =>
    safeTrack('Delegate Button Clicked', props),
  registerDelegateeClicked: () => safeTrack('Register Delegatee Clicked'),

  // External link events
  bridgeLinkClicked: (props: { bridgeName: string }) => safeTrack('Bridge Link Clicked', props),
  externalLinkClicked: (props: { url: string; context?: string }) =>
    safeTrack('External Link Clicked', props),
};
