// How many of the newest closed proposals the score looks at, at most
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
  // Proposals actually scored: PARTICIPATION_WINDOW, or fewer on a chain with less history
  window: number;
}

// What the DB hands over: per account, the 1-based positions (newest first) of the
// closed proposals it still holds a ballot on, plus how many closed proposals exist
export interface ParticipationData {
  closedProposals: number;
  votedRanks: AddressTo<number[]>;
}

function weight(rank: number) {
  return PARTICIPATION_DECAY ** (rank - 1);
}

// Ranks outside the window are ignored so callers can pass a full history. The
// denominator only counts proposals that exist, so a young chain can still reach 100.
export function scoreParticipation(
  ranks: number[],
  closedProposals = PARTICIPATION_WINDOW,
): Participation {
  const window = Math.max(0, Math.min(PARTICIPATION_WINDOW, closedProposals));
  const inWindow = [...new Set(ranks)].filter((r) => r >= 1 && r <= window);
  let total = 0;
  for (let rank = 1; rank <= window; rank++) total += weight(rank);
  const earned = inWindow.reduce((sum, rank) => sum + weight(rank), 0);
  return {
    score: total ? Math.round((earned / total) * 100) : 0,
    votedRecent: inWindow.filter((r) => r <= PARTICIPATION_RECENT).length,
    votedInWindow: inWindow.length,
    window,
  };
}

// Hover text: what the number is, how it is weighted, the raw counts behind it,
// and what counts as a vote.
export function describeParticipation({
  score,
  votedRecent,
  votedInWindow,
  window,
}: Participation): string[] {
  const decayPercent = Math.round((1 - PARTICIPATION_DECAY) * 100);
  const counts =
    window > PARTICIPATION_RECENT
      ? `Voted on ${votedRecent} of the last ${PARTICIPATION_RECENT} and ${votedInWindow} of the last ${window}.`
      : `Voted on ${votedInWindow} of the last ${window}.`;
  return [
    `Participation score ${score} / 100`,
    `Weighted share of the last ${window} proposals with closed voting that this delegate voted on. The newest proposal weighs 100% and each older one ${decayPercent}% less, so missing a recent vote costs more than missing an old one.`,
    counts,
    'Yes, No and Abstain all count as a vote. Revoked votes and proposals still open for voting do not.',
  ];
}
