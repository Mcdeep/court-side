import type { RoundPlan } from "./americano";

// Fixed-pair round robin (circle method).
// Participants are split into P=N/2 fixed pairs.
// Each pair plays every other pair exactly once.
// Rounds: P-1 (P even) or P (P odd, one bye per round).
// Court numbers cycle through 1..courtCount when matches > courts.
export function generateRoundRobinRounds(
  participantIds: string[],
  courtCount: number,
): RoundPlan[] {
  const n = participantIds.length;
  if (n < 4) throw new Error("Round Robin requires at least 4 participants");

  const usable = Math.floor(n / 2) * 2;
  const ids = participantIds.slice(0, usable);

  // Fixed pairs: team[i] = (ids[2i], ids[2i+1])
  const teams: [string, string][] = [];
  for (let i = 0; i < usable; i += 2) {
    teams.push([ids[i], ids[i + 1]]);
  }

  const P = teams.length;
  // Add null sentinel for bye when P is odd
  const sched: ([string, string] | null)[] = P % 2 === 0
    ? [...teams]
    : [...teams, null];
  const S = sched.length; // always even
  const numRounds = P % 2 === 0 ? P - 1 : P;

  const rounds: RoundPlan[] = [];

  for (let r = 0; r < numRounds; r++) {
    // Circle method: fix sched[0], rotate sched[1..S-1]
    const rotated: ([string, string] | null)[] = [sched[0]];
    for (let i = 1; i < S; i++) {
      rotated.push(sched[((i - 1 + r) % (S - 1)) + 1]);
    }

    const round: RoundPlan = [];
    for (let i = 0; i < S / 2; i++) {
      const a = rotated[i];
      const b = rotated[S - 1 - i];
      if (a !== null && b !== null) {
        round.push({
          pairA: a,
          pairB: b,
          courtNumber: (round.length % courtCount) + 1,
        });
      }
    }

    if (round.length > 0) rounds.push(round);
  }

  return rounds;
}
