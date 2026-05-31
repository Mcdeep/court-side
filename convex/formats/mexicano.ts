import type { RoundPlan } from "./americano";

// Mexicano: one round at a time, paired by current standings.
// Rank 1+2 pair up and play rank 3+4; rank 5+6 vs rank 7+8; etc.
// participantsByRank must already be sorted highest-points first.
// First round: pass participants in any order (no leaderboard yet).
export function generateMexicanoRound(
  participantsByRank: string[],
  courtCount: number,
): RoundPlan {
  const n = participantsByRank.length;
  if (n < 4) throw new Error("Mexicano requires at least 4 participants");

  const usable = Math.floor(n / 4) * 4;
  const ids = participantsByRank.slice(0, usable);
  const courts = Math.min(courtCount, usable / 4);

  const round: RoundPlan = [];
  for (let c = 0; c < courts; c++) {
    const base = c * 4;
    round.push({
      pairA: [ids[base], ids[base + 1]],
      pairB: [ids[base + 2], ids[base + 3]],
      courtNumber: c + 1,
    });
  }
  return round;
}
