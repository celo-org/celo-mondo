import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const MOCK_SIGNING_KEY = 'test-alchemy-signing-key';
const MOCK_APPROVER_MULTISIG = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;
const MOCK_GOVERNANCE_ADDRESS = '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972' as Address;

// --- Mocks ---

vi.mock('src/config/database', () => ({
  default: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const mockFetchHistoricalEventsAndSaveToDBProgressively = vi.fn().mockResolvedValue([]);
vi.mock('src/features/governance/fetchHistoricalEventsAndSaveToDBProgressively', () => ({
  default: (...args: unknown[]) => mockFetchHistoricalEventsAndSaveToDBProgressively(...args),
}));

const mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively = vi.fn().mockResolvedValue({
  transactionIds: [],
  confirmationCount: 0,
  lastEventBlock: null,
});
vi.mock('src/features/governance/fetchHistoricalMultiSigEventsAndSaveToDBProgressively', () => ({
  default: (...args: unknown[]) =>
    mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively(...args),
}));

const mockUpdateApprovalsInDB = vi.fn().mockResolvedValue(undefined);
vi.mock('src/features/governance/updateApprovalsInDB', () => ({
  default: (...args: unknown[]) => mockUpdateApprovalsInDB(...args),
}));

const mockUpdateProposalsInDB = vi.fn().mockResolvedValue(undefined);
vi.mock('src/features/governance/updateProposalsInDB', () => ({
  default: (...args: unknown[]) => mockUpdateProposalsInDB(...args),
}));

const mockDecodeAndPrepareProposalEvent = vi.fn().mockResolvedValue(null);
vi.mock('src/features/governance/utils/events/proposal', () => ({
  decodeAndPrepareProposalEvent: (...args: unknown[]) => mockDecodeAndPrepareProposalEvent(...args),
}));

const mockDecodeAndPrepareVoteEvent = vi.fn().mockResolvedValue([]);
vi.mock('src/features/governance/utils/events/vote', () => ({
  decodeAndPrepareVoteEvent: (...args: unknown[]) => mockDecodeAndPrepareVoteEvent(...args),
}));

const mockReadContract = vi.fn();
vi.mock('src/utils/client', () => ({
  celoPublicClient: {
    chain: { id: 42220 },
    readContract: (...args: unknown[]) => mockReadContract(...args),
  },
}));

const mockSendAlertToSlack = vi.fn().mockResolvedValue(undefined);
vi.mock('src/config/slackbot', () => ({
  sendAlertToSlack: (...args: unknown[]) => mockSendAlertToSlack(...args),
}));

const mockDecodeEventLog = vi.fn().mockReturnValue({ eventName: 'ProposalQueued', args: {} });
vi.mock('viem', async (importOriginal) => {
  const original = await importOriginal<typeof import('viem')>();
  return { ...original, decodeEventLog: (...args: unknown[]) => mockDecodeEventLog(...args) };
});

// --- Helpers ---

function signPayload(payload: string): string {
  return createHmac('sha256', MOCK_SIGNING_KEY).update(payload, 'utf8').digest('hex');
}

function makeAlchemyLog(
  overrides: Partial<{
    topics: string[];
    data: string;
    address: string;
    txHash: string;
    txStatus: number;
  }> = {},
) {
  return {
    index: 0,
    data: overrides.data ?? '0x',
    topics: overrides.topics ?? [
      '0x1bfe527f3548d9258c2512b6689f0acfccdd0557d80a53845db25fc57e93d8fe', // ProposalQueued
    ],
    account: { address: overrides.address ?? MOCK_GOVERNANCE_ADDRESS },
    transaction: {
      hash: overrides.txHash ?? '0xabc123',
      index: 0,
      from: { address: '0x1234' },
      to: { address: MOCK_GOVERNANCE_ADDRESS },
      status: overrides.txStatus ?? 1,
    },
  };
}

function makeAlchemyPayload(logs: ReturnType<typeof makeAlchemyLog>[], blockNumber = 12345678) {
  return {
    webhookId: 'wh_123',
    id: 'evt_123',
    createdAt: '2026-04-01T00:00:00Z',
    type: 'GRAPHQL',
    event: {
      data: {
        block: {
          number: blockNumber,
          timestamp: 1743465600,
          logs,
        },
      },
      sequenceNumber: '1',
    },
  };
}

function createSignedRequest(payload: object): NextRequest {
  const body = JSON.stringify(payload);
  const signature = signPayload(body);
  return new NextRequest('http://localhost/api/webhooks/alchemy', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'x-alchemy-signature': signature,
    },
  });
}

// --- Tests ---

describe('POST /api/webhooks/alchemy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALCHEMY_SIGNING_KEY = MOCK_SIGNING_KEY;
    process.env.ACTIVE_WEBHOOK_PROVIDER = 'alchemy';
    mockReadContract.mockResolvedValue(MOCK_APPROVER_MULTISIG);
  });

  afterEach(() => {
    delete process.env.ACTIVE_WEBHOOK_PROVIDER;
  });

  describe('signature verification', () => {
    it('returns 403 when signature header is missing', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/alchemy', {
        method: 'POST',
        body: JSON.stringify(makeAlchemyPayload([])),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 when signature is invalid', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/alchemy', {
        method: 'POST',
        body: JSON.stringify(makeAlchemyPayload([])),
        headers: { 'x-alchemy-signature': 'invalid-signature' },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 500 when ALCHEMY_SIGNING_KEY is not set', async () => {
      delete process.env.ALCHEMY_SIGNING_KEY;

      const payload = makeAlchemyPayload([]);
      const body = JSON.stringify(payload);
      const request = new NextRequest('http://localhost/api/webhooks/alchemy', {
        method: 'POST',
        body,
        headers: { 'x-alchemy-signature': signPayload(body) },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('returns 200 when signature is valid', async () => {
      const request = createSignedRequest(makeAlchemyPayload([]));
      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('MultiSig event processing', () => {
    it('collects transactionIds from backfill result and decoded args, passes them to updateApprovalsInDB', async () => {
      const backfillTxIds = [100n, 101n];
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: backfillTxIds,
        confirmationCount: 2,
        lastEventBlock: 59520678n,
      });
      mockDecodeEventLog.mockReturnValue({
        eventName: 'Confirmation',
        args: { sender: '0x1234', transactionId: 102n },
      });

      const log = makeAlchemyLog({
        topics: ['0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef'],
        address: MOCK_APPROVER_MULTISIG,
      });

      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively).toHaveBeenCalledWith(
        'Confirmation',
        expect.objectContaining({ chain: { id: 42220 } }),
      );
      expect(mockUpdateApprovalsInDB).toHaveBeenCalledTimes(1);

      const passedTxIds = mockUpdateApprovalsInDB.mock.calls[0][1] as bigint[];
      expect(passedTxIds).toEqual(expect.arrayContaining([100n, 101n, 102n]));
      expect(passedTxIds).toHaveLength(3);
    });

    it('deduplicates transactionIds from backfill and decoded args', async () => {
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: [248n],
        confirmationCount: 1,
        lastEventBlock: 59520678n,
      });
      mockDecodeEventLog.mockReturnValue({
        eventName: 'Confirmation',
        args: { sender: '0x1234', transactionId: 248n },
      });

      const log = makeAlchemyLog({
        topics: ['0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef'],
        address: MOCK_APPROVER_MULTISIG,
      });

      const request = createSignedRequest(makeAlchemyPayload([log]));
      await POST(request);

      const passedTxIds = mockUpdateApprovalsInDB.mock.calls[0][1] as bigint[];
      expect(passedTxIds).toHaveLength(1);
      expect(passedTxIds).toContainEqual(248n);
    });

    it('handles backfill returning transactionIds even when log decoding fails', async () => {
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: [200n, 201n],
        confirmationCount: 2,
        lastEventBlock: 59520678n,
      });
      mockDecodeEventLog.mockImplementation(() => {
        throw new Error('decode failed');
      });

      const log = makeAlchemyLog({
        topics: ['0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef'],
        address: MOCK_APPROVER_MULTISIG,
      });

      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      const passedTxIds = mockUpdateApprovalsInDB.mock.calls[0][1] as bigint[];
      expect(passedTxIds).toEqual(expect.arrayContaining([200n, 201n]));
    });

    it('processes Revocation events through the same pipeline', async () => {
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: [50n],
        confirmationCount: 0,
        lastEventBlock: 100n,
      });
      mockDecodeEventLog.mockReturnValue({
        eventName: 'Revocation',
        args: { sender: '0x1234', transactionId: 50n },
      });

      const log = makeAlchemyLog({
        topics: ['0xf6a317157440607f36269043eb55f1287a5a19ba2216afeab88cd46cbcfb88e9'],
        address: MOCK_APPROVER_MULTISIG,
      });

      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively).toHaveBeenCalledWith(
        'Revocation',
        expect.anything(),
      );
      expect(mockUpdateApprovalsInDB).toHaveBeenCalled();
    });

    it('does not call updateApprovalsInDB when no multisig events are present', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(1n);

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      await POST(request);

      expect(mockUpdateApprovalsInDB).not.toHaveBeenCalled();
    });

    it('does not treat events from non-approver multisig as multisig events', async () => {
      mockDecodeEventLog.mockReturnValue({
        eventName: 'Confirmation',
        args: { sender: '0x1234', transactionId: 42n },
      });

      const log = makeAlchemyLog({
        topics: ['0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef'],
        address: '0x0000000000000000000000000000000000000001',
      });

      const request = createSignedRequest(makeAlchemyPayload([log]));
      await POST(request);

      expect(mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateApprovalsInDB).not.toHaveBeenCalled();
    });
  });

  describe('Governance event processing', () => {
    it('processes proposal events and calls updateProposalsInDB', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).toHaveBeenCalledWith(
        'ProposalQueued',
        expect.anything(),
      );
      expect(mockUpdateProposalsInDB).toHaveBeenCalledWith(expect.anything(), [278n], 'update');
    });

    it('includes proposalIds from governance backfill in updateProposalsInDB call', async () => {
      mockFetchHistoricalEventsAndSaveToDBProgressively.mockResolvedValueOnce([275n, 276n]);
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      const passedProposalIds = mockUpdateProposalsInDB.mock.calls[0][1] as bigint[];
      expect(passedProposalIds).toEqual(expect.arrayContaining([275n, 276n, 278n]));
      expect(passedProposalIds).toHaveLength(3);
    });

    it('updates proposals from backfill even when webhook event decoding returns null', async () => {
      mockFetchHistoricalEventsAndSaveToDBProgressively.mockResolvedValueOnce([275n]);
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(null);
      mockDecodeAndPrepareVoteEvent.mockResolvedValueOnce([]);

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateProposalsInDB).toHaveBeenCalledWith(expect.anything(), [275n], 'update');
    });

    it('handles mixed governance and multisig events in a single webhook', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: [248n],
        confirmationCount: 1,
        lastEventBlock: 100n,
      });
      mockDecodeEventLog.mockReturnValue({
        eventName: 'Confirmation',
        args: { sender: '0x1234', transactionId: 248n },
      });

      const govLog = makeAlchemyLog();
      const msigLog = makeAlchemyLog({
        topics: ['0x4a504a94899432a9846e1aa406dceb1bcfd538bb839071d49d1e5e23f5be30ef'],
        address: MOCK_APPROVER_MULTISIG,
      });

      const request = createSignedRequest(makeAlchemyPayload([govLog, msigLog]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateProposalsInDB).toHaveBeenCalled();
      expect(mockUpdateApprovalsInDB).toHaveBeenCalled();
    });

    it('skips logs with unknown topic0', async () => {
      const log = makeAlchemyLog({ topics: ['0xdeadbeef'] });
      const request = createSignedRequest(makeAlchemyPayload([log]));
      await POST(request);

      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateProposalsInDB).not.toHaveBeenCalled();
    });

    it('skips logs from reverted transactions', async () => {
      const log = makeAlchemyLog({ txStatus: 0 });
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateProposalsInDB).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sends Slack alert and returns 500 on error', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('RPC failed'));

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockSendAlertToSlack).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process celo-mondo alchemy webhook'),
      );
    });
  });

  describe('feature flag', () => {
    it('returns 200 without processing when ACTIVE_WEBHOOK_PROVIDER is multibaas', async () => {
      process.env.ACTIVE_WEBHOOK_PROVIDER = 'multibaas';

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateProposalsInDB).not.toHaveBeenCalled();
    });

    it('returns 200 when inactive even without ALCHEMY_SIGNING_KEY set', async () => {
      process.env.ACTIVE_WEBHOOK_PROVIDER = 'multibaas';
      delete process.env.ALCHEMY_SIGNING_KEY;

      const request = new NextRequest('http://localhost/api/webhooks/alchemy', {
        method: 'POST',
        body: '{}',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('processes normally when ACTIVE_WEBHOOK_PROVIDER is alchemy', async () => {
      process.env.ACTIVE_WEBHOOK_PROVIDER = 'alchemy';
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).toHaveBeenCalled();
      expect(mockUpdateProposalsInDB).toHaveBeenCalled();
    });

    it('returns 200 without processing when ACTIVE_WEBHOOK_PROVIDER is not set (defaults to multibaas)', async () => {
      delete process.env.ACTIVE_WEBHOOK_PROVIDER;

      const log = makeAlchemyLog();
      const request = createSignedRequest(makeAlchemyPayload([log]));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateProposalsInDB).not.toHaveBeenCalled();
    });
  });
});
