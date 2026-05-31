export type MatchPlan = {
  pairA: [string, string];
  pairB: [string, string];
  courtNumber: number;
};

export type RoundPlan = MatchPlan[];

// Round-robin rotation: fix index 0, rotate the rest.
// Top half of rotated array partner with each other, play against bottom half.
export function generateAmericanoRounds(
  participantIds: string[],
  courtCount: number,
): RoundPlan[] {
  const n = participantIds.length;
  if (n < 4) throw new Error("Americano requires at least 4 participants");

  const usable = Math.floor(n / 4) * 4;
  const ids = participantIds.slice(0, usable);
  const half = usable / 2;
  const courts = Math.min(courtCount, half / 2);
  const numRounds = usable - 1;

  const rounds: RoundPlan[] = [];

  for (let r = 0; r < numRounds; r++) {
    // Fix ids[0], rotate ids[1..usable-1]
    const rotated: string[] = [ids[0]];
    for (let i = 1; i < usable; i++) {
      rotated.push(ids[((i - 1 + r) % (usable - 1)) + 1]);
    }

    const round: RoundPlan = [];
    for (let c = 0; c < courts; c++) {
      round.push({
        pairA: [rotated[c * 2], rotated[c * 2 + 1]],
        pairB: [rotated[half + c * 2], rotated[half + c * 2 + 1]],
        courtNumber: c + 1,
      });
    }
    rounds.push(round);
  }

  return rounds;
}
