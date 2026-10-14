// How many of the newest closed proposals the score looks at
export const PARTICIPATION_WINDOW = 30;
// The "recent" count shown next to the score
export const PARTICIPATION_RECENT = 10;
// Weight multiplier applied for every step back in time, so the newest proposal
// weighs 1 and the oldest in the window weighs DECAY^(WINDOW-1)
export const PARTICIPATION_DECAY = 0.9;

export interface Participation {
  // 0-100: decayed share of the window's proposals the account voted on
  score: number;
  votedRecent: number;
  votedInWindow: number;
}

function weight(rank: number) {
  return PARTICIPATION_DECAY ** (rank - 1);
}

// ranks: 1-based positions, newest first, of the closed proposals the account voted on.
// Ranks outside the window are ignored so callers can pass a full history.
export function scoreParticipation(ranks: number[]): Participation {
  const inWindow = [...new Set(ranks)].filter((r) => r >= 1 && r <= PARTICIPATION_WINDOW);
  let total = 0;
  for (let rank = 1; rank <= PARTICIPATION_WINDOW; rank++) total += weight(rank);
  const earned = inWindow.reduce((sum, rank) => sum + weight(rank), 0);
  return {
    score: Math.round((earned / total) * 100),
    votedRecent: inWindow.filter((r) => r <= PARTICIPATION_RECENT).length,
    votedInWindow: inWindow.length,
  };
}

// Hover text: what the number is, how it is weighted, the raw counts behind it,
// and what counts as a vote.
export function describeParticipation({
  score,
  votedRecent,
  votedInWindow,
}: Participation): string[] {
  const decayPercent = Math.round((1 - PARTICIPATION_DECAY) * 100);
  return [
    `Participation score ${score} / 100`,
    `Weighted share of the last ${PARTICIPATION_WINDOW} proposals with closed voting that this delegate voted on. The newest proposal weighs 100% and each older one ${decayPercent}% less, so missing a recent vote costs more than missing an old one.`,
    `Voted on ${votedRecent} of the last ${PARTICIPATION_RECENT} and ${votedInWindow} of the last ${PARTICIPATION_WINDOW}.`,
    'Yes, No and Abstain all count as a vote. Proposals still open for voting are not counted.',
  ];
}
