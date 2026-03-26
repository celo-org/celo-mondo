import { afterEach, beforeEach } from 'node:test';
import { publicClient } from 'src/test/anvil/utils';
import { describe, expect, test, vi } from 'vitest';
import { getEffectiveStage, getStageEndTimestamp } from './governanceData';
import { ProposalStage } from './types';

beforeEach(() => {
  vi.mock('wagmi', async (importActual) => ({
    ...(await importActual()),
    usePublicClient: () => publicClient,
  }));

  vi.mock('src/components/notifications/useToastError', async (importActual) => ({
    ...(await importActual()),
    useToastError: () => {},
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getStageEndTimestamp', () => {
  test('Approval', () => {
    expect(getStageEndTimestamp(ProposalStage.Approval, 1000)).toMatchInlineSnapshot(`864001000`);
  });
  test('Queued', () => {
    expect(getStageEndTimestamp(ProposalStage.Queued, 1000)).toMatchInlineSnapshot(`2419201000`);
  });
  test('Referendum', () => {
    expect(getStageEndTimestamp(ProposalStage.Referendum, 1000)).toMatchInlineSnapshot(`604801000`);
  });
  test('Expiration', () => {
    expect(getStageEndTimestamp(ProposalStage.Expiration, 1000)).toMatchInlineSnapshot(`864001000`);
  });
  test('Execution', () => {
    expect(getStageEndTimestamp(ProposalStage.Execution, 1000)).toMatchInlineSnapshot(`864001000`);
  });
  describe('Others', () => {
    [
      ProposalStage.None,
      ProposalStage.Rejected,
      ProposalStage.Withdrawn,
      ProposalStage.Executed,
    ].forEach((stage) => {
      test(ProposalStage[stage], () => {
        expect(getStageEndTimestamp(stage, 1000)).toBeUndefined();
      });
    });
  });
});

describe('getEffectiveStage', () => {
  test('returns dbStage when dequeuedAt is null', () => {
    expect(getEffectiveStage(ProposalStage.Referendum, null)).toBe(ProposalStage.Referendum);
  });

  test('returns Referendum when voting period has not ended', () => {
    const recentDequeue = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    expect(getEffectiveStage(ProposalStage.Referendum, recentDequeue)).toBe(
      ProposalStage.Referendum,
    );
  });

  test('advances Referendum to Execution when voting period has ended', () => {
    const oldDequeue = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago
    expect(getEffectiveStage(ProposalStage.Referendum, oldDequeue)).toBe(ProposalStage.Execution);
  });

  test('returns Execution when execution window has not ended', () => {
    const dequeue = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago (within 10 day window)
    expect(getEffectiveStage(ProposalStage.Execution, dequeue)).toBe(ProposalStage.Execution);
  });

  test('advances Execution to Expiration when execution window has ended', () => {
    const oldDequeue = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(); // 11 days ago
    expect(getEffectiveStage(ProposalStage.Execution, oldDequeue)).toBe(ProposalStage.Expiration);
  });

  test('does not advance terminal stages', () => {
    const oldDequeue = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(getEffectiveStage(ProposalStage.Executed, oldDequeue)).toBe(ProposalStage.Executed);
    expect(getEffectiveStage(ProposalStage.Rejected, oldDequeue)).toBe(ProposalStage.Rejected);
  });

  test('does not advance Queued stage', () => {
    const oldDequeue = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(getEffectiveStage(ProposalStage.Queued, oldDequeue)).toBe(ProposalStage.Queued);
  });
});
