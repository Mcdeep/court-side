import type { RoundPlan } from "./americano";

// Round 1: random assignment — same as any other first round.
export function generateKingFirstRound(
  participantIds: string[],
  courtCount: number,
): RoundPlan {
  const n = participantIds.length;
  if (n < 4) throw new Error("King of the Court requires at least 4 participants");

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

// Subsequent rounds: kings (current winners per court) stay, challengers come from queue.
// kings and challengers must be the same length (one challenger per court).
export function generateKingNextRound(
  kings: [string, string][],
  challengers: [string, string][],
  courtCount: number,
): RoundPlan {
  if (kings.length === 0) throw new Error("No kings — cannot generate next round");
  if (challengers.length === 0) throw new Error("Queue empty — no challengers available");

  const courts = Math.min(courtCount, kings.length, challengers.length);
  const round: RoundPlan = [];
  for (let c = 0; c < courts; c++) {
    round.push({
      pairA: kings[c],
      pairB: challengers[c],
      courtNumber: c + 1,
    });
  }
  return round;
}
