import type { RoundPlan } from "./americano";

function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Fixed-pair round robin (circle method).
// Participants are split into P=N/2 fixed pairs.
// Each pair plays every other pair exactly once.
// Circle-method "legs": P-1 (P even) or P (P odd, one bye per leg).
// Each leg has up to floor(P/2) simultaneous matchups; when that exceeds
// courtCount, the leg is split into consecutive court-capped waves so no
// two matches in the same physical round ever share a court.
//
// The circle method fixes one team (sched[0]) as the rotation anchor, so
// without reshuffling it would always land in the leg's first matchup —
// and therefore always the same court. Matchups within each leg are
// shuffled before court numbers are assigned so courts vary leg to leg.
export function generateRoundRobinRounds(
  participantIds: string[],
  courtCount: number,
  random: () => number = Math.random,
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
  const numLegs = P % 2 === 0 ? P - 1 : P;

  const rounds: RoundPlan[] = [];

  for (let leg = 0; leg < numLegs; leg++) {
    // Circle method: fix sched[0], rotate sched[1..S-1]
    const rotated: ([string, string] | null)[] = [sched[0]];
    for (let i = 1; i < S; i++) {
      rotated.push(sched[((i - 1 + leg) % (S - 1)) + 1]);
    }

    const matchups: { pairA: [string, string]; pairB: [string, string] }[] = [];
    for (let i = 0; i < S / 2; i++) {
      const a = rotated[i];
      const b = rotated[S - 1 - i];
      if (a !== null && b !== null) {
        matchups.push({ pairA: a, pairB: b });
      }
    }

    // Shuffle so the circle method's fixed anchor team doesn't always land
    // in the first matchup (and therefore always the same court).
    const shuffledMatchups = shuffled(matchups, random);

    // Split this leg into court-capped waves so no two matches in the
    // same round are assigned the same court at the same time.
    for (let i = 0; i < shuffledMatchups.length; i += courtCount) {
      const wave = shuffledMatchups.slice(i, i + courtCount);
      const round: RoundPlan = wave.map((m, idx) => ({
        pairA: m.pairA,
        pairB: m.pairB,
        courtNumber: idx + 1,
      }));
      rounds.push(round);
    }
  }

  return rounds;
}

// Pure round-count estimate (no participant IDs needed) — used by the
// tournament wizard to suggest a default round duration before players
// have been assigned to teams.
export function countRoundRobinRounds(teamCount: number, courtCount: number): number {
  const P = Math.floor(teamCount);
  if (P < 2 || courtCount < 1) return 0;
  const numLegs = P % 2 === 0 ? P - 1 : P;
  const matchesPerLeg = Math.floor(P / 2);
  const wavesPerLeg = Math.max(1, Math.ceil(matchesPerLeg / courtCount));
  return numLegs * wavesPerLeg;
}
