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
    expect(getExpiryTimestamp(ProposalStage.Approval, 1000)).toMatchInlineSnapshot(`86401000`);
  });
  test('Queued', () => {
    expect(getExpiryTimestamp(ProposalStage.Queued, 1000)).toMatchInlineSnapshot(`2419201000`);
  });
  test('Referendum', () => {
    expect(getExpiryTimestamp(ProposalStage.Referendum, 1000)).toMatchInlineSnapshot(`604801000`);
  });
  test('Execution', () => {
    expect(getExpiryTimestamp(ProposalStage.Execution, 1000)).toMatchInlineSnapshot(`864001000`);
  });
  test('Others', () => {
    [
      ProposalStage.None,
      ProposalStage.Expiration,
      ProposalStage.Rejected,
      ProposalStage.Withdrawn,
      ProposalStage.Executed,
    ].forEach((stage) => {
      expect(getExpiryTimestamp(stage, 1000)).toBeUndefined();
    });
  });
});
