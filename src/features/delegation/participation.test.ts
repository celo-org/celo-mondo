import {
  PARTICIPATION_RECENT,
  PARTICIPATION_WINDOW,
  describeParticipation,
  scoreParticipation,
} from 'src/features/delegation/participation';
import { describe, expect, it } from 'vitest';

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('scoreParticipation', () => {
  it('ranks the four delegate profiles in the intended order', () => {
    const recentAndLongHistory = scoreParticipation(range(1, PARTICIPATION_WINDOW)).score;
    const recentOnly = scoreParticipation(range(1, PARTICIPATION_RECENT)).score;
    const missedSomeRecently = scoreParticipation(range(5, PARTICIPATION_WINDOW)).score;
    const stoppedVoting = scoreParticipation(
      range(PARTICIPATION_RECENT + 1, PARTICIPATION_WINDOW),
    ).score;

    expect(recentAndLongHistory).toBe(100);
    expect(recentAndLongHistory).toBeGreaterThan(recentOnly);
    expect(recentOnly).toBeGreaterThan(missedSomeRecently);
    expect(missedSomeRecently).toBeGreaterThan(stoppedVoting);
    expect(stoppedVoting).toBeGreaterThan(0);
  });

  it('weighs a newer vote more than an older one', () => {
    expect(scoreParticipation([1]).score).toBeGreaterThan(scoreParticipation([2]).score);
  });

  it('counts recent and window votes', () => {
    expect(scoreParticipation([1, 3, 10, 11, 30])).toMatchObject({
      votedRecent: 3,
      votedInWindow: 5,
    });
  });

  it('ignores ranks outside the window and duplicate ranks', () => {
    expect(scoreParticipation([1, 1, 0, PARTICIPATION_WINDOW + 1])).toEqual(
      scoreParticipation([1]),
    );
  });

  it('scores an account with no votes as zero', () => {
    expect(scoreParticipation([])).toEqual({ score: 0, votedRecent: 0, votedInWindow: 0 });
  });
});

describe('describeParticipation', () => {
  it('explains the score, the weighting and the counts behind it', () => {
    const lines = describeParticipation({ score: 73, votedRecent: 9, votedInWindow: 23 });
    expect(lines[0]).toBe('Participation score 73 / 100');
    expect(lines[1]).toContain('last 30 proposals with closed voting');
    expect(lines[1]).toContain('each older one 10% less');
    expect(lines[2]).toBe('Voted on 9 of the last 10 and 23 of the last 30.');
    expect(lines[3]).toContain('Yes, No and Abstain all count');
  });
});
