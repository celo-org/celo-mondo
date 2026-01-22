import { track } from '@vercel/analytics';

type AllowedPropertyValues = string | number | boolean | null;

export const analytics = {
  // Wallet events
  walletConnected: (props?: { walletType?: string }) => track('Wallet Connected', props),
  walletDisconnected: () => track('Wallet Disconnected'),

  // Transaction success events
  stakeCompleted: (props: { action: string; amount: number; group?: string }) =>
    track('Stake Completed', props),
  lockCompleted: (props: { action: string; amount: number }) => track('Lock Completed', props),
  voteCompleted: (props: { voteType: string; proposalId: number }) =>
    track('Vote Completed', props),
  upvoteCompleted: (props: { proposalId: number }) => track('Upvote Completed', props),
  delegateCompleted: (props: { action: string; percent: number }) =>
    track('Delegate Completed', props),
  accountCreated: () => track('Account Created'),

  // Navigation events
  navClicked: (props: { item: string }) => track('Nav Clicked', props),
  modeToggled: (props: { mode: string }) => track('Mode Toggled', props),

  // Proposal events
  proposalViewed: (props: { proposalId: string; stage?: string }) =>
    track('Proposal Viewed', props),
  proposalFilterChanged: (props: { filter: string }) => track('Proposal Filter Changed', props),
  voteButtonClicked: (props: { proposalId: number; voteType: string }) =>
    track('Vote Button Clicked', props),
  upvoteButtonClicked: (props: { proposalId: number }) => track('Upvote Button Clicked', props),

  // Validator/Staking events
  validatorGroupViewed: (props: { groupAddress: string; groupName?: string }) =>
    track('Validator Group Viewed', props),
  validatorFilterChanged: (props: { filter: string }) => track('Validator Filter Changed', props),
  stakeButtonClicked: (props: { groupAddress: string }) => track('Stake Button Clicked', props),
  stakeMenuClicked: (props: { action: string; groupAddress: string }) =>
    track('Stake Menu Clicked', props),

  // Delegate events
  delegateeViewed: (props: { delegateeAddress: string; delegateeName?: string }) =>
    track('Delegatee Viewed', props),
  delegateButtonClicked: (props?: { delegateeAddress?: string }) =>
    track('Delegate Button Clicked', props),
  registerDelegateeClicked: () => track('Register Delegatee Clicked'),

  // External link events
  bridgeLinkClicked: (props: { bridgeName: string }) => track('Bridge Link Clicked', props),
  externalLinkClicked: (props: { url: string; context?: string }) =>
    track('External Link Clicked', props),
};
