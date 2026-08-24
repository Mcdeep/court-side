import type { RoundPlan } from "./americano";

// Mexicano: one round at a time, paired by current standings.
// Within each block of 4, rank 1+3 play rank 2+4 (block 1: ranks 1-4, block 2: ranks 5-8, etc).
// participantsByRank must already be sorted highest-points first.
// First round: pass participants sorted by skill rating (no leaderboard yet).
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
      pairA: [ids[base], ids[base + 2]],
      pairB: [ids[base + 1], ids[base + 3]],
      courtNumber: c + 1,
    });
  }
  return round;
}
