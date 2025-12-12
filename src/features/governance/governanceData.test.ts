import { afterEach, beforeEach } from 'node:test';
import { publicClient } from 'src/test/anvil/utils';
import { describe, expect, test, vi } from 'vitest';
import { getStageEndTimestamp } from './governanceData';
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
