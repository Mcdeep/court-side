import type { RoundPlan } from "./americano";

// Round 1: sequential seeding — positions 0+1 vs 2+3, 4+5 vs 6+7, etc.
export function generateKnockoutFirstRound(
  participantIds: string[],
  courtCount: number,
): RoundPlan {
  const n = participantIds.length;
  if (n < 4) throw new Error("Knockout requires at least 4 participants");

  const usable = Math.floor(n / 4) * 4;
  const ids = participantIds.slice(0, usable);
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

// Subsequent rounds: winners[0] vs winners[1], winners[2] vs winners[3], etc.
// winnerPairs are sorted by their match's courtNumber from the previous round.
export function generateKnockoutNextRound(
  winnerPairs: [string, string][],
  courtCount: number,
): RoundPlan {
  if (winnerPairs.length < 2) {
    throw new Error("Tournament complete — no more rounds to generate");
  }

  const usable = Math.floor(winnerPairs.length / 2) * 2;
  const courts = Math.min(courtCount, usable / 2);

  const round: RoundPlan = [];
  for (let c = 0; c < courts; c++) {
    round.push({
      pairA: winnerPairs[c * 2],
      pairB: winnerPairs[c * 2 + 1],
      courtNumber: c + 1,
    });
  }
  return round;
}
