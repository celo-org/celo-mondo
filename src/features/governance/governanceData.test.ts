import { afterEach, beforeEach } from 'node:test';
import { publicClient } from 'src/test/anvil/utils';
import { describe, expect, test, vi } from 'vitest';
import { getExpiryTimestamp } from './governanceData';
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

describe('getExpiryTimestamp', () => {
  test('Approval', () => {
    expect(getExpiryTimestamp(ProposalStage.Approval, 1000)).toMatchInlineSnapshot(`691201000`);
  });
  test('Queued', () => {
    expect(getExpiryTimestamp(ProposalStage.Queued, 1000)).toMatchInlineSnapshot(`2419201000`);
  });
  test('Referendum', () => {
    expect(getExpiryTimestamp(ProposalStage.Referendum, 1000)).toMatchInlineSnapshot(`604801000`);
  });
  test('Expiration', () => {
    expect(getExpiryTimestamp(ProposalStage.Expiration, 1000)).toMatchInlineSnapshot(`604801000`);
  });
  describe('Others', () => {
    [
      ProposalStage.None,
      ProposalStage.Rejected,
      ProposalStage.Withdrawn,
      ProposalStage.Execution,
      ProposalStage.Executed,
    ].forEach((stage) => {
      test(ProposalStage[stage], () => {
        expect(getExpiryTimestamp(stage, 1000)).toBeUndefined();
      });
    });
  });
});
