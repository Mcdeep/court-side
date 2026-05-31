import type { RoundPlan } from "./americano";

// Round 1: sequential assignment — same as any other first round.
// Pairs 0+1 on court 1, pairs 2+3 on court 2, etc.
export function generateSnakesFirstRound(
  participantIds: string[],
  courtCount: number,
): RoundPlan {
  const n = participantIds.length;
  if (n < 4) throw new Error("Snakes & Ladders requires at least 4 participants");

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

// Subsequent rounds: group pairs by current court level.
// If a level has an odd number of pairs, the spare pair gets a bye (skipped).
export function generateSnakesNextRound(
  pairs: { level: number; pair: [string, string] }[],
  courtCount: number,
): RoundPlan {
  const byLevel = new Map<number, [string, string][]>();
  for (const { level, pair } of pairs) {
    const group = byLevel.get(level) ?? [];
    group.push(pair);
    byLevel.set(level, group);
  }

  const round: RoundPlan = [];
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);

  for (const level of sortedLevels) {
    if (round.length >= courtCount) break;
    const levelPairs = byLevel.get(level)!;
    if (levelPairs.length < 2) continue; // odd — bye
    round.push({
      pairA: levelPairs[0],
      pairB: levelPairs[1],
      courtNumber: level,
    });
  }

  return round;
}
