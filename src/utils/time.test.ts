import { ProposalStage } from 'src/features/governance/types';
import { describe, expect, it, vi } from 'vitest';
import { getHumanEndTime } from './time';

describe('getHumanEndTime', () => {
  describe('pastEndTime scenarios', () => {
    it('should show "awaiting update" message for Referendum stage when voting has ended', () => {
      // Mock Date.now() to return a specific time
      const now = new Date('2024-01-15T12:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Set dequeued time to be far enough in the past that the voting period has ended
      // Referendum stage lasts 7 days (604800000 ms)
      const dequeuedAt = new Date('2024-01-01T12:00:00Z').toISOString();

      const result = getHumanEndTime({
        queuedAt: null,
        dequeuedAt,
        executedAt: null,
        stage: ProposalStage.Referendum,
        quorumMet: null,
      });

      expect(result).toContain('Voting Ended on');
      expect(result).toContain('(awaiting update)');
    });

    it('should show countdown message for Referendum stage when voting is still active', () => {
      // Mock Date.now() to return a specific time
      const now = new Date('2024-01-02T12:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Set dequeued time to be recent so voting period is still active
      const dequeuedAt = new Date('2024-01-01T12:00:00Z').toISOString();

      const result = getHumanEndTime({
        queuedAt: null,
        dequeuedAt,
        executedAt: null,
        stage: ProposalStage.Referendum,
        quorumMet: null,
      });

      expect(result).toContain('Voting ends in');
      expect(result).not.toContain('(awaiting update)');
    });

    it('should show "awaiting update" message for Execution stage when execution window has closed', () => {
      // Mock Date.now() to return a specific time
      const now = new Date('2024-01-20T12:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Set dequeued time to be far enough in the past that the execution window has closed
      // Execution window ends 10 days after dequeue (7 days referendum + 3 days execution)
      const dequeuedAt = new Date('2024-01-01T12:00:00Z').toISOString();

      const result = getHumanEndTime({
        queuedAt: null,
        dequeuedAt,
        executedAt: null,
        stage: ProposalStage.Execution,
        quorumMet: null,
      });

      expect(result).toContain('Execution window closed on');
      expect(result).toContain('(awaiting update)');
    });

    it('should show countdown message for Execution stage when execution window is still open', () => {
      // Mock Date.now() to return a specific time
      const now = new Date('2024-01-07T12:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Set dequeued time so execution window is still open
      const dequeuedAt = new Date('2024-01-01T12:00:00Z').toISOString();

      const result = getHumanEndTime({
        queuedAt: null,
        dequeuedAt,
        executedAt: null,
        stage: ProposalStage.Execution,
        quorumMet: null,
      });

      expect(result).toContain('Execution window ends in');
      expect(result).not.toContain('(awaiting update)');
    });

    it('should handle exactly at the boundary (endDate - now === 0)', () => {
      // Mock Date.now() to return a specific time
      const now = new Date('2024-01-08T12:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Set dequeued time exactly 7 days before now (end of referendum period)
      const dequeuedAt = new Date('2024-01-01T12:00:00Z').toISOString();

      const result = getHumanEndTime({
        queuedAt: null,
        dequeuedAt,
        executedAt: null,
        stage: ProposalStage.Referendum,
        quorumMet: null,
      });

      // At exactly the boundary (0), pastEndTime should be false (0 < 0 is false)
      expect(result).toContain('Voting ends in');
    });

    it('should handle barely past the end time (negative by 1 second)', () => {
      // Mock Date.now() to return a time 1 second past the end
      const dequeuedAt = new Date('2024-01-01T12:00:00Z').toISOString();
      const dequeuedTime = new Date(dequeuedAt).getTime();
      // 7 days = 604800000 ms, add 1 second (1000 ms)
      const now = dequeuedTime + 604800000 + 1000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const result = getHumanEndTime({
        queuedAt: null,
        dequeuedAt,
        executedAt: null,
        stage: ProposalStage.Referendum,
        quorumMet: null,
      });

      expect(result).toContain('Voting Ended on');
      expect(result).toContain('(awaiting update)');
    });
  });
});
