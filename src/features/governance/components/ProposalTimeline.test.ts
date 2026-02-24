import {
  EXECUTION_STAGE_EXPIRY_TIME,
  QUEUED_STAGE_EXPIRY_TIME,
  REFERENDUM_STAGE_EXPIRY_TIME,
} from 'src/config/consts';
import { MergedProposalData } from 'src/features/governance/governanceData';
import { ProposalStage } from 'src/features/governance/types';
import { describe, expect, test } from 'vitest';
import { buildTimelineSteps } from './ProposalTimeline';

// Helpers

const JAN_01 = '2024-01-01T12:00:00Z';
const JAN_01_MS = new Date(JAN_01).getTime();
const DEQUEUED_MS = JAN_01_MS + QUEUED_STAGE_EXPIRY_TIME;
const DEQUEUED_AT = new Date(DEQUEUED_MS).toISOString();
const VOTING_END = DEQUEUED_MS + REFERENDUM_STAGE_EXPIRY_TIME;
const EXECUTION_END = DEQUEUED_MS + REFERENDUM_STAGE_EXPIRY_TIME + EXECUTION_STAGE_EXPIRY_TIME;
const APPROVED_AT = new Date(VOTING_END + 1000).toISOString();
const APPROVED_MS = new Date(APPROVED_AT).getTime();
const EXECUTED_AT = new Date(EXECUTION_END - 1000).toISOString();
const EXECUTED_MS = new Date(EXECUTED_AT).getTime();

function makePropData(
  overrides: Partial<
    Pick<
      MergedProposalData,
      | 'stage'
      | 'queuedAt'
      | 'dequeuedAt'
      | 'approvedAt'
      | 'executedAt'
      | 'transactionCount'
      | 'history'
    >
  >,
): MergedProposalData {
  return {
    id: 1,
    stage: ProposalStage.Queued,
    timestamp: JAN_01_MS / 1000,
    url: '',
    proposer: '0x0000000000000000000000000000000000000001',
    deposit: 0n,
    numTransactions: 1n,
    networkWeight: 0n,
    isPassing: false,
    upvotes: 0n,
    votes: { yes: 0n, no: 0n, abstain: 0n },
    queuedAt: JAN_01,
    dequeuedAt: null,
    approvedAt: null,
    executedAt: null,
    transactionCount: 1,
    history: [],
    proposal: {
      id: 1,
      stage: ProposalStage.Queued,
      timestamp: JAN_01_MS / 1000,
      url: '',
      proposer: '0x0000000000000000000000000000000000000001',
      deposit: 0n,
      numTransactions: 1n,
      networkWeight: 0n,
      isPassing: false,
      upvotes: 0n,
      votes: { yes: 0n, no: 0n, abstain: 0n },
    },
    ...overrides,
  } as MergedProposalData;
}

function labels(steps: ReturnType<typeof buildTimelineSteps>) {
  return steps.map((s) => s.label);
}

function statuses(steps: ReturnType<typeof buildTimelineSteps>) {
  return steps.map((s) => s.status);
}

// Tests

describe('buildTimelineSteps', () => {
  test('returns empty array when no timestamps available', () => {
    const data = makePropData({ queuedAt: null, dequeuedAt: null });
    expect(buildTimelineSteps(data, null)).toEqual([]);
  });

  describe('Active Upvoting (Queued)', () => {
    test('shows Upvoting as active with future steps', () => {
      const data = makePropData({ stage: ProposalStage.Queued });
      const steps = buildTimelineSteps(data, null);

      expect(labels(steps)).toEqual(['Upvoting', 'Voting', 'Approval', 'Execution', 'Expiration']);
      expect(statuses(steps)).toEqual(['active', 'future', 'future', 'future', 'future']);
    });

    test('Upvoting has correct start and end times', () => {
      const data = makePropData({ stage: ProposalStage.Queued });
      const steps = buildTimelineSteps(data, null);

      expect(steps[0].startTime).toBe(JAN_01_MS);
      expect(steps[0].endTime).toBe(JAN_01_MS + QUEUED_STAGE_EXPIRY_TIME);
    });
  });

  describe('Active Voting (Referendum)', () => {
    test('shows Upvoting completed and Voting active', () => {
      const data = makePropData({
        stage: ProposalStage.Referendum,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);

      expect(labels(steps)).toEqual(['Upvoting', 'Voting', 'Approval', 'Execution', 'Expiration']);
      expect(statuses(steps)).toEqual(['completed', 'active', 'future', 'future', 'future']);
    });

    test('Voting has correct start and end times', () => {
      const data = makePropData({
        stage: ProposalStage.Referendum,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const voting = steps.find((s) => s.label === 'Voting')!;

      expect(voting.startTime).toBe(DEQUEUED_MS);
      expect(voting.endTime).toBe(VOTING_END);
    });

    test('pending Approval is placed before Execution', () => {
      const data = makePropData({
        stage: ProposalStage.Referendum,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const approvalIdx = steps.findIndex((s) => s.label === 'Approval');
      const executionIdx = steps.findIndex((s) => s.label === 'Execution');

      expect(approvalIdx).toBeLessThan(executionIdx);
      expect(steps[approvalIdx].status).toBe('future');
      expect(steps[approvalIdx].isEvent).toBe(true);
    });
  });

  describe('Active Execution', () => {
    test('shows Execution active with implied Approved before it', () => {
      const data = makePropData({
        stage: ProposalStage.Execution,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);

      // approvalImplied is true when stage is Execution, so Approved is placed before Execution
      expect(labels(steps)).toEqual(['Upvoting', 'Voting', 'Approved', 'Execution', 'Expiration']);
      expect(statuses(steps)).toEqual(['completed', 'completed', 'completed', 'active', 'future']);
    });
  });

  describe('Successfully Executed', () => {
    test('shows all phases completed with Executed terminal event', () => {
      const data = makePropData({
        stage: ProposalStage.Executed,
        dequeuedAt: DEQUEUED_AT,
        approvedAt: APPROVED_AT,
        executedAt: EXECUTED_AT,
      });
      const steps = buildTimelineSteps(data, null);

      expect(labels(steps)).toContain('Upvoting');
      expect(labels(steps)).toContain('Voting');
      expect(labels(steps)).toContain('Approved');
      expect(labels(steps)).toContain('Execution');
      expect(labels(steps)).toContain('Executed');
      expect(statuses(steps).every((s) => s === 'completed')).toBe(true);
    });

    test('Approved event has correct timestamp', () => {
      const data = makePropData({
        stage: ProposalStage.Executed,
        dequeuedAt: DEQUEUED_AT,
        approvedAt: APPROVED_AT,
        executedAt: EXECUTED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const approved = steps.find((s) => s.label === 'Approved')!;

      expect(approved.timestamp).toBe(APPROVED_MS);
      expect(approved.isEvent).toBe(true);
    });

    test('Executed event has correct timestamp', () => {
      const data = makePropData({
        stage: ProposalStage.Executed,
        dequeuedAt: DEQUEUED_AT,
        approvedAt: APPROVED_AT,
        executedAt: EXECUTED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const executed = steps.find((s) => s.label === 'Executed')!;

      expect(executed.timestamp).toBe(EXECUTED_MS);
      expect(executed.isEvent).toBe(true);
    });
  });

  describe('Executed without approvedAt (implied approval)', () => {
    test('inserts Approved (completed) before Execution', () => {
      const data = makePropData({
        stage: ProposalStage.Executed,
        dequeuedAt: DEQUEUED_AT,
        executedAt: EXECUTED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const approvedIdx = steps.findIndex((s) => s.label === 'Approved');
      const executionIdx = steps.findIndex((s) => s.label === 'Execution');

      expect(approvedIdx).toBeGreaterThan(-1);
      expect(approvedIdx).toBeLessThan(executionIdx);
      expect(steps[approvedIdx].status).toBe('completed');
      expect(steps[approvedIdx].timestamp).toBeUndefined();
    });
  });

  describe('Rejected', () => {
    test('skips Approval and Execution, shows Rejected as failed', () => {
      const data = makePropData({
        stage: ProposalStage.Rejected,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);

      expect(labels(steps)).toEqual(['Upvoting', 'Voting', 'Rejected']);
      expect(statuses(steps)).toEqual(['completed', 'completed', 'failed']);
    });

    test('Rejected event has timestamp at voting end', () => {
      const data = makePropData({
        stage: ProposalStage.Rejected,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const rejected = steps.find((s) => s.label === 'Rejected')!;

      expect(rejected.timestamp).toBe(VOTING_END);
      expect(rejected.isEvent).toBe(true);
    });
  });

  describe('Withdrawn', () => {
    test('skips Approval and Execution, shows Withdrawn as failed', () => {
      const data = makePropData({
        stage: ProposalStage.Withdrawn,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);

      expect(labels(steps)).toEqual(['Upvoting', 'Voting', 'Withdrawn']);
      expect(statuses(steps)).toEqual(['completed', 'completed', 'failed']);
    });

    test('Withdrawn has no timestamp', () => {
      const data = makePropData({
        stage: ProposalStage.Withdrawn,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const withdrawn = steps.find((s) => s.label === 'Withdrawn')!;

      expect(withdrawn.timestamp).toBeUndefined();
    });
  });

  describe('Expired (quorum met — approval not required)', () => {
    test('shows Approval Not Required after Voting, no Execution', () => {
      const data = makePropData({
        stage: ProposalStage.Expiration,
        dequeuedAt: DEQUEUED_AT,
        transactionCount: 5,
      });
      const steps = buildTimelineSteps(data, true);

      expect(labels(steps)).toEqual(['Upvoting', 'Voting', 'Approval Not Required', 'Expired']);
      expect(statuses(steps)).toEqual(['completed', 'completed', 'completed', 'failed']);
    });

    test('Expired timestamp is at execution end when quorum met', () => {
      const data = makePropData({
        stage: ProposalStage.Expiration,
        dequeuedAt: DEQUEUED_AT,
        transactionCount: 5,
      });
      const steps = buildTimelineSteps(data, true);
      const expired = steps.find((s) => s.label === 'Expired')!;

      expect(expired.timestamp).toBe(EXECUTION_END);
    });
  });

  describe('Expired (quorum not met)', () => {
    test('Expired timestamp is at voting end when quorum not met', () => {
      const data = makePropData({
        stage: ProposalStage.Expiration,
        dequeuedAt: DEQUEUED_AT,
        transactionCount: 5,
      });
      const steps = buildTimelineSteps(data, false);
      const expired = steps.find((s) => s.label === 'Expired')!;

      expect(expired.timestamp).toBe(VOTING_END);
    });
  });

  describe('Expired with approved (execution missed)', () => {
    test('shows Approved event and completed Execution, then Expired', () => {
      const data = makePropData({
        stage: ProposalStage.Expiration,
        dequeuedAt: DEQUEUED_AT,
        approvedAt: APPROVED_AT,
        transactionCount: 5,
      });
      const steps = buildTimelineSteps(data, true);

      expect(labels(steps)).toContain('Approved');
      expect(labels(steps)).toContain('Execution');
      expect(labels(steps)).toContain('Expired');

      const execution = steps.find((s) => s.label === 'Execution')!;
      expect(execution.status).toBe('completed');
    });
  });

  describe('Adopted (0 transactions)', () => {
    test('skips Execution, shows Adopted as completed', () => {
      const data = makePropData({
        stage: ProposalStage.Adopted,
        dequeuedAt: DEQUEUED_AT,
        transactionCount: 0,
      });
      const steps = buildTimelineSteps(data, null);

      expect(labels(steps)).toContain('Adopted');
      expect(labels(steps)).not.toContain('Execution');

      const adopted = steps.find((s) => s.label === 'Adopted')!;
      expect(adopted.status).toBe('completed');
      expect(adopted.isEvent).toBe(true);
    });
  });

  describe('Timestamp fallback (back-calculation)', () => {
    test('infers dequeuedAt from executedAt when missing', () => {
      const data = makePropData({
        stage: ProposalStage.Executed,
        queuedAt: JAN_01,
        dequeuedAt: null,
        approvedAt: APPROVED_AT,
        executedAt: EXECUTED_AT,
      });
      const steps = buildTimelineSteps(data, null);

      // Should infer dequeuedMs = executedMs - REFERENDUM - EXECUTION
      const expectedDequeued =
        EXECUTED_MS - REFERENDUM_STAGE_EXPIRY_TIME - EXECUTION_STAGE_EXPIRY_TIME;
      const voting = steps.find((s) => s.label === 'Voting')!;

      expect(voting.startTime).toBe(expectedDequeued);
      expect(voting.status).toBe('completed');
    });

    test('infers dequeuedAt from approvedAt when executedAt also missing', () => {
      const data = makePropData({
        stage: ProposalStage.Expiration,
        queuedAt: JAN_01,
        dequeuedAt: null,
        approvedAt: APPROVED_AT,
        executedAt: null,
        transactionCount: 5,
      });
      const steps = buildTimelineSteps(data, true);

      // Should infer dequeuedMs = approvedMs - REFERENDUM
      const expectedDequeued = APPROVED_MS - REFERENDUM_STAGE_EXPIRY_TIME;
      const voting = steps.find((s) => s.label === 'Voting')!;

      expect(voting.startTime).toBe(expectedDequeued);
    });
  });

  describe('Approval chronological positioning', () => {
    test('Approved with timestamp is placed at chronological position', () => {
      const earlyApproval = new Date(DEQUEUED_MS + 1000).toISOString();
      const data = makePropData({
        stage: ProposalStage.Executed,
        dequeuedAt: DEQUEUED_AT,
        approvedAt: earlyApproval,
        executedAt: EXECUTED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const approvedIdx = steps.findIndex((s) => s.label === 'Approved');
      const votingIdx = steps.findIndex((s) => s.label === 'Voting');

      // Early approval (right after dequeue) should be after Voting
      // since Voting starts at dequeuedMs and approval is at dequeuedMs + 1000
      expect(approvedIdx).toBeGreaterThan(votingIdx);
    });
  });

  describe('Future Expiration has date', () => {
    test('Expiration step shows executionEnd as startTime', () => {
      const data = makePropData({
        stage: ProposalStage.Execution,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const expiration = steps.find((s) => s.label === 'Expiration')!;

      expect(expiration.startTime).toBe(EXECUTION_END);
      expect(expiration.status).toBe('future');
    });
  });

  describe('Phase start/end time consistency', () => {
    test('Execution start equals voting end', () => {
      const data = makePropData({
        stage: ProposalStage.Execution,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const voting = steps.find((s) => s.label === 'Voting')!;
      const execution = steps.find((s) => s.label === 'Execution')!;

      expect(execution.startTime).toBe(voting.endTime);
    });

    test('Upvoting end equals Voting start when dequeued', () => {
      const data = makePropData({
        stage: ProposalStage.Referendum,
        dequeuedAt: DEQUEUED_AT,
      });
      const steps = buildTimelineSteps(data, null);
      const upvoting = steps.find((s) => s.label === 'Upvoting')!;
      const voting = steps.find((s) => s.label === 'Voting')!;

      expect(upvoting.endTime).toBe(voting.startTime);
    });
  });
});
