import { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
import { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const MOCK_WEBHOOK_SECRET = 'test-webhook-secret';
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

// --- Helpers ---

function signPayload(payload: string, timestamp: string): string {
  const hmac = createHmac('sha256', MOCK_WEBHOOK_SECRET);
  hmac.update(Buffer.from(payload));
  hmac.update(timestamp);
  return hmac.digest().toString('hex');
}

function makeMultiBaasEvent(overrides: {
  name: string;
  contractAddress?: string;
  inputs?: { name: string; value: string; hashed: boolean; type: string }[];
  rawFields?: string;
}) {
  return {
    id: 'test-event-id',
    event: 'event.emitted',
    data: {
      triggeredAt: '2025-02-18T12:00:00Z',
      event: {
        name: overrides.name,
        signature: `${overrides.name}(uint256)`,
        inputs: overrides.inputs ?? [],
        rawFields: overrides.rawFields ?? '{}',
        contract: {
          address: overrides.contractAddress ?? MOCK_GOVERNANCE_ADDRESS,
          addressLabel: 'Governance',
          name: 'Governance',
          label: 'Governance',
        },
        indexInLog: 0,
      },
    },
  };
}

function createSignedRequest(events: ReturnType<typeof makeMultiBaasEvent>[]): NextRequest {
  const payload = JSON.stringify(events);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signPayload(payload, timestamp);

  return new NextRequest('http://localhost/api/webhooks/multibaas', {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'X-MultiBaas-Signature': signature,
      'X-MultiBaas-Timestamp': timestamp,
    },
  });
}

// --- Tests ---

describe('POST /api/webhooks/multibaas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MULTIBAAS_WEBHOOK_SECRET = MOCK_WEBHOOK_SECRET;
    mockReadContract.mockResolvedValue(MOCK_APPROVER_MULTISIG);
  });

  afterEach(() => {
    delete process.env.MULTIBAAS_WEBHOOK_SECRET;
  });

  describe('signature verification', () => {
    it('returns 403 when signature header is missing', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/multibaas', {
        method: 'POST',
        body: '[]',
        headers: {
          'X-MultiBaas-Timestamp': '12345',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 when timestamp header is missing', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/multibaas', {
        method: 'POST',
        body: '[]',
        headers: {
          'X-MultiBaas-Signature': 'invalid',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 403 when signature is invalid', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/multibaas', {
        method: 'POST',
        body: '[]',
        headers: {
          'X-MultiBaas-Signature': 'invalid-signature',
          'X-MultiBaas-Timestamp': '12345',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 200 when signature is valid', async () => {
      const request = createSignedRequest([]);
      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('MultiSig event processing', () => {
    it('collects transactionIds from the delivered event (rawFields args + inputs)', async () => {
      const event = makeMultiBaasEvent({
        name: 'Confirmation',
        contractAddress: MOCK_APPROVER_MULTISIG,
        inputs: [{ name: 'transactionId', value: '102', hashed: false, type: 'uint256' }],
        rawFields: JSON.stringify({
          args: { sender: '0x1234', transactionId: '103' },
        }),
      });

      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateApprovalsInDB).toHaveBeenCalledTimes(1);

      // rawFields args ID (103) and inputs ID (102), both from the payload
      const passedTxIds = mockUpdateApprovalsInDB.mock.calls[0][1] as bigint[];
      expect(passedTxIds).toEqual(expect.arrayContaining([102n, 103n]));
      expect(passedTxIds).toHaveLength(2);
    });

    it('deduplicates transactionIds from multiple sources', async () => {
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: [248n],
        confirmationCount: 1,
        lastEventBlock: 59520678n,
      });

      const event = makeMultiBaasEvent({
        name: 'Confirmation',
        contractAddress: MOCK_APPROVER_MULTISIG,
        inputs: [{ name: 'transactionId', value: '248', hashed: false, type: 'uint256' }],
        rawFields: JSON.stringify({
          args: { sender: '0x1234', transactionId: '248' },
        }),
      });

      const request = createSignedRequest([event]);
      await POST(request);

      const passedTxIds = mockUpdateApprovalsInDB.mock.calls[0][1] as bigint[];
      expect(passedTxIds).toHaveLength(1);
      expect(passedTxIds).toContainEqual(248n);
    });

    it('skips approvals when rawFields is unparsable and no inputs provide a transactionId', async () => {
      const event = makeMultiBaasEvent({
        name: 'Confirmation',
        contractAddress: MOCK_APPROVER_MULTISIG,
        inputs: [],
        rawFields: 'not-valid-json',
      });

      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateApprovalsInDB).not.toHaveBeenCalled();
    });

    it('processes Revocation events through the same pipeline', async () => {
      const event = makeMultiBaasEvent({
        name: 'Revocation',
        contractAddress: MOCK_APPROVER_MULTISIG,
        inputs: [{ name: 'transactionId', value: '50', hashed: false, type: 'uint256' }],
      });

      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateApprovalsInDB).toHaveBeenCalledWith(expect.anything(), [50n]);
    });

    it('does not call updateApprovalsInDB when no multisig events are present', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(1n);

      const event = makeMultiBaasEvent({
        name: 'ProposalQueued',
        rawFields: JSON.stringify({ topics: ['0x'], data: '0x' }),
      });

      const request = createSignedRequest([event]);
      await POST(request);

      expect(mockUpdateApprovalsInDB).not.toHaveBeenCalled();
    });

    it('does not treat events from non-approver multisig as multisig events', async () => {
      const event = makeMultiBaasEvent({
        name: 'Confirmation',
        contractAddress: '0x0000000000000000000000000000000000000001',
      });

      const request = createSignedRequest([event]);
      await POST(request);

      expect(mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateApprovalsInDB).not.toHaveBeenCalled();
    });
  });

  describe('Governance event processing', () => {
    it('processes proposal events and calls updateProposalsInDB', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);

      const event = makeMultiBaasEvent({
        name: 'ProposalQueued',
        rawFields: JSON.stringify({ topics: ['0x'], data: '0x' }),
      });

      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateProposalsInDB).toHaveBeenCalledWith(expect.anything(), [278n], 'update');
    });

    it('does not call updateProposalsInDB when the event decodes to neither proposal nor vote', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(null);
      mockDecodeAndPrepareVoteEvent.mockResolvedValueOnce([]);

      const event = makeMultiBaasEvent({
        name: 'ProposalQueued',
        rawFields: JSON.stringify({ topics: ['0x'], data: '0x' }),
      });

      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateProposalsInDB).not.toHaveBeenCalled();
    });

    it('handles mixed governance and multisig events in a single webhook', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);
      mockFetchHistoricalMultiSigEventsAndSaveToDBProgressively.mockResolvedValueOnce({
        transactionIds: [248n],
        confirmationCount: 1,
        lastEventBlock: 100n,
      });

      const govEvent = makeMultiBaasEvent({
        name: 'ProposalQueued',
        rawFields: JSON.stringify({ topics: ['0x'], data: '0x' }),
      });
      const msigEvent = makeMultiBaasEvent({
        name: 'Confirmation',
        contractAddress: MOCK_APPROVER_MULTISIG,
        inputs: [{ name: 'transactionId', value: '248', hashed: false, type: 'uint256' }],
      });

      const request = createSignedRequest([govEvent, msigEvent]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateProposalsInDB).toHaveBeenCalled();
      expect(mockUpdateApprovalsInDB).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sends Slack alert and returns 500 on error', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('RPC failed'));

      const event = makeMultiBaasEvent({ name: 'Confirmation' });
      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockSendAlertToSlack).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process celo-mondo webhook'),
      );
    });
  });

  describe('provider gating (webhook secret presence)', () => {
    it('processes when the webhook secret is configured', async () => {
      mockDecodeAndPrepareProposalEvent.mockResolvedValueOnce(278n);

      const event = makeMultiBaasEvent({
        name: 'ProposalQueued',
        rawFields: JSON.stringify({ topics: ['0x'], data: '0x' }),
      });
      const request = createSignedRequest([event]);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdateProposalsInDB).toHaveBeenCalled();
    });

    it('no-ops with 200 when the webhook secret is absent (provider disabled)', async () => {
      delete process.env.MULTIBAAS_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost/api/webhooks/multibaas', {
        method: 'POST',
        body: '{}',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFetchHistoricalEventsAndSaveToDBProgressively).not.toHaveBeenCalled();
      expect(mockUpdateProposalsInDB).not.toHaveBeenCalled();
    });
  });
});
