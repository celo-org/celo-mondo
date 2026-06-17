import { DelegateActionType } from 'src/features/delegation/types';
import { VoteType } from 'src/features/governance/types';
import { LockActionType } from 'src/features/locking/types';
import { StakeActionType } from 'src/features/staking/types';
import { describe, expect, it } from 'vitest';
import { validateAnalyticsEvent } from './analytics';

describe('Analytics Event Validation', () => {
  describe('bridge_clicked', () => {
    it('should accept valid bridge IDs', () => {
      const result = validateAnalyticsEvent('bridge_clicked', {
        bridgeId: 'superbridge',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all configured bridge IDs', () => {
      const validBridgeIds = ['superbridge', 'squid-router', 'jumper', 'portal-bridge', 'usdt0'];
      for (const bridgeId of validBridgeIds) {
        const result = validateAnalyticsEvent('bridge_clicked', { bridgeId });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid bridge IDs', () => {
      const result = validateAnalyticsEvent('bridge_clicked', {
        bridgeId: 'invalid-bridge',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid enum value');
    });

    it('should reject missing bridgeId', () => {
      const result = validateAnalyticsEvent('bridge_clicked', {});
      expect(result.success).toBe(false);
    });
  });

  describe('wallet_connected', () => {
    it('should accept valid wallet type', () => {
      const result = validateAnalyticsEvent('wallet_connected', {
        walletType: 'MetaMask',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional wallet type', () => {
      const result = validateAnalyticsEvent('wallet_connected', {});
      expect(result.success).toBe(true);
    });

    it('should reject too long wallet type', () => {
      const result = validateAnalyticsEvent('wallet_connected', {
        walletType: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty wallet type', () => {
      const result = validateAnalyticsEvent('wallet_connected', {
        walletType: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('wallet_disconnected', () => {
    it('should accept empty properties', () => {
      const result = validateAnalyticsEvent('wallet_disconnected', {});
      expect(result.success).toBe(true);
    });
  });

  describe('stake_completed', () => {
    it('should accept valid stake action', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: StakeActionType.Stake,
        amount: 100.5,
        group: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept unstake action', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: StakeActionType.Unstake,
        amount: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: 'invalid-action',
        amount: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: StakeActionType.Stake,
        amount: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid EVM address', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: StakeActionType.Stake,
        amount: 100,
        group: 'invalid-address',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-finite amount', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: StakeActionType.Stake,
        amount: Infinity,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('lock_completed', () => {
    it('should accept all lock actions', () => {
      const actions = [LockActionType.Lock, LockActionType.Unlock, LockActionType.Withdraw];
      for (const action of actions) {
        const result = validateAnalyticsEvent('lock_completed', {
          action,
          amount: 100,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid lock action', () => {
      const result = validateAnalyticsEvent('lock_completed', {
        action: 'invalid-lock-action',
        amount: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('vote_completed', () => {
    it('should accept all vote types', () => {
      const voteTypes = [VoteType.Yes, VoteType.No, VoteType.Abstain, VoteType.None];
      for (const voteType of voteTypes) {
        const result = validateAnalyticsEvent('vote_completed', {
          voteType,
          proposalId: 42,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid vote type', () => {
      const result = validateAnalyticsEvent('vote_completed', {
        voteType: 'invalid-vote-type',
        proposalId: 42,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative proposal ID', () => {
      const result = validateAnalyticsEvent('vote_completed', {
        voteType: VoteType.Yes,
        proposalId: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer proposal ID', () => {
      const result = validateAnalyticsEvent('vote_completed', {
        voteType: VoteType.Yes,
        proposalId: 42.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('upvote_completed', () => {
    it('should accept valid proposal ID', () => {
      const result = validateAnalyticsEvent('upvote_completed', {
        proposalId: 123,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative proposal ID', () => {
      const result = validateAnalyticsEvent('upvote_completed', {
        proposalId: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('delegate_completed', () => {
    it('should accept all delegate actions', () => {
      const actions = [
        DelegateActionType.Delegate,
        DelegateActionType.Undelegate,
        DelegateActionType.Transfer,
      ];
      for (const action of actions) {
        const result = validateAnalyticsEvent('delegate_completed', {
          action,
          percent: 50,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid percentage range', () => {
      const percentages = [0, 25.5, 50, 100];
      for (const percent of percentages) {
        const result = validateAnalyticsEvent('delegate_completed', {
          action: DelegateActionType.Delegate,
          percent,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject percentage over 100', () => {
      const result = validateAnalyticsEvent('delegate_completed', {
        action: DelegateActionType.Delegate,
        percent: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative percentage', () => {
      const result = validateAnalyticsEvent('delegate_completed', {
        action: DelegateActionType.Delegate,
        percent: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-finite percentage', () => {
      const result = validateAnalyticsEvent('delegate_completed', {
        action: DelegateActionType.Delegate,
        percent: Infinity,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('account_created', () => {
    it('should accept empty properties', () => {
      const result = validateAnalyticsEvent('account_created', {});
      expect(result.success).toBe(true);
    });
  });

  describe('nav_clicked', () => {
    it('should accept valid navigation item', () => {
      const result = validateAnalyticsEvent('nav_clicked', {
        item: 'governance',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty item', () => {
      const result = validateAnalyticsEvent('nav_clicked', {
        item: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long item', () => {
      const result = validateAnalyticsEvent('nav_clicked', {
        item: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('mode_toggled', () => {
    it('should accept valid modes', () => {
      const modes = ['CELO', 'stCELO'];
      for (const mode of modes) {
        const result = validateAnalyticsEvent('mode_toggled', { mode });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid mode', () => {
      const result = validateAnalyticsEvent('mode_toggled', {
        mode: 'invalid-mode',
      });
      expect(result.success).toBe(false);
    });

    it('should reject lowercase modes', () => {
      const result = validateAnalyticsEvent('mode_toggled', {
        mode: 'celo',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('proposal_viewed', () => {
    it('should accept valid proposal ID', () => {
      const result = validateAnalyticsEvent('proposal_viewed', {
        proposalId: 'CGP-001',
        stage: 'Active',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional stage', () => {
      const result = validateAnalyticsEvent('proposal_viewed', {
        proposalId: 'CGP-001',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty proposal ID', () => {
      const result = validateAnalyticsEvent('proposal_viewed', {
        proposalId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long proposal ID', () => {
      const result = validateAnalyticsEvent('proposal_viewed', {
        proposalId: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('external_link_clicked', () => {
    it('should accept valid URL with context', () => {
      const result = validateAnalyticsEvent('external_link_clicked', {
        url: 'https://example.com',
        context: 'proposal',
      });
      expect(result.success).toBe(true);
    });

    it('should accept both valid contexts', () => {
      const contexts = ['proposal', 'cgp'];
      for (const context of contexts) {
        const result = validateAnalyticsEvent('external_link_clicked', {
          url: 'https://example.com',
          context,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional context', () => {
      const result = validateAnalyticsEvent('external_link_clicked', {
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid context', () => {
      const result = validateAnalyticsEvent('external_link_clicked', {
        url: 'https://example.com',
        context: 'invalid-context',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const result = validateAnalyticsEvent('external_link_clicked', {
        url: 'not-a-url',
        context: 'proposal',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long URL', () => {
      const result = validateAnalyticsEvent('external_link_clicked', {
        url: 'https://example.com/' + 'a'.repeat(2000),
        context: 'proposal',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validator_group_viewed', () => {
    it('should accept valid EVM address', () => {
      const result = validateAnalyticsEvent('validator_group_viewed', {
        groupAddress: '0x1234567890123456789012345678901234567890',
        groupName: 'Test Group',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional group name', () => {
      const result = validateAnalyticsEvent('validator_group_viewed', {
        groupAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid address format', () => {
      const result = validateAnalyticsEvent('validator_group_viewed', {
        groupAddress: '0x123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject address without 0x prefix', () => {
      const result = validateAnalyticsEvent('validator_group_viewed', {
        groupAddress: '1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-hex characters in address', () => {
      const result = validateAnalyticsEvent('validator_group_viewed', {
        groupAddress: '0x123456789012345678901234567890123456789g',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('stake_button_clicked', () => {
    it('should accept valid EVM address', () => {
      const result = validateAnalyticsEvent('stake_button_clicked', {
        groupAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept missing groupAddress (empty state buttons)', () => {
      const result = validateAnalyticsEvent('stake_button_clicked', {});
      expect(result.success).toBe(true);
    });

    it('should reject invalid address format', () => {
      const result = validateAnalyticsEvent('stake_button_clicked', {
        groupAddress: 'invalid-address',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('stake_menu_clicked', () => {
    it('should accept valid stake action and address', () => {
      const result = validateAnalyticsEvent('stake_menu_clicked', {
        action: StakeActionType.Stake,
        groupAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept unstake action', () => {
      const result = validateAnalyticsEvent('stake_menu_clicked', {
        action: StakeActionType.Unstake,
        groupAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = validateAnalyticsEvent('stake_menu_clicked', {
        action: 'invalid-action',
        groupAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid group address', () => {
      const result = validateAnalyticsEvent('stake_menu_clicked', {
        action: StakeActionType.Stake,
        groupAddress: 'invalid-address',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('delegatee_viewed', () => {
    it('should accept valid delegatee address', () => {
      const result = validateAnalyticsEvent('delegatee_viewed', {
        delegateeAddress: '0x1234567890123456789012345678901234567890',
        delegateeName: 'Test Delegatee',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional delegatee name', () => {
      const result = validateAnalyticsEvent('delegatee_viewed', {
        delegateeAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid delegatee address', () => {
      const result = validateAnalyticsEvent('delegatee_viewed', {
        delegateeAddress: 'invalid-address',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('delegate_button_clicked', () => {
    it('should accept valid optional delegatee address', () => {
      const result = validateAnalyticsEvent('delegate_button_clicked', {
        delegateeAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should accept missing delegatee address', () => {
      const result = validateAnalyticsEvent('delegate_button_clicked', {});
      expect(result.success).toBe(true);
    });

    it('should reject invalid delegatee address', () => {
      const result = validateAnalyticsEvent('delegate_button_clicked', {
        delegateeAddress: 'invalid-address',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('register_delegatee_clicked', () => {
    it('should accept empty properties', () => {
      const result = validateAnalyticsEvent('register_delegatee_clicked', {});
      expect(result.success).toBe(true);
    });
  });

  describe('unknown event type', () => {
    it('should reject unknown event names', () => {
      const result = validateAnalyticsEvent('unknown_event' as any, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown event type');
    });
  });

  describe('edge cases', () => {
    it('should handle null properties', () => {
      const result = validateAnalyticsEvent('bridge_clicked', null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined properties', () => {
      const result = validateAnalyticsEvent('bridge_clicked', undefined);
      expect(result.success).toBe(false);
    });

    it('should handle array as properties', () => {
      const result = validateAnalyticsEvent('bridge_clicked', []);
      expect(result.success).toBe(false);
    });

    it('should handle string as properties', () => {
      const result = validateAnalyticsEvent('bridge_clicked', 'invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('extra properties rejection', () => {
    it('should reject bridge_clicked with extra properties', () => {
      const result = validateAnalyticsEvent('bridge_clicked', {
        bridgeId: 'superbridge',
        extraProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject wallet_connected with extra properties', () => {
      const result = validateAnalyticsEvent('wallet_connected', {
        walletType: 'MetaMask',
        extraProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject stake_completed with extra properties', () => {
      const result = validateAnalyticsEvent('stake_completed', {
        action: StakeActionType.Stake,
        amount: 100,
        extraProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject vote_completed with extra properties', () => {
      const result = validateAnalyticsEvent('vote_completed', {
        voteType: VoteType.Yes,
        proposalId: 42,
        extraProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject delegate_completed with extra properties', () => {
      const result = validateAnalyticsEvent('delegate_completed', {
        action: DelegateActionType.Delegate,
        percent: 50,
        extraProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject external_link_clicked with extra properties', () => {
      const result = validateAnalyticsEvent('external_link_clicked', {
        url: 'https://example.com',
        context: 'proposal',
        extraProp: 'value',
      });
      expect(result.success).toBe(false);
    });
  });
});
