import { DEFAULT_TIEBREAK_ORDER } from "./tiebreaks";
import type { Tiebreak } from "./tiebreaks";

export type StandingsMatch = { pairA: string[]; pairB: string[]; scoreA: number; scoreB: number };

export function rankStandings<Row extends { participantId: string; points: number; wins: number; losses: number }>(
  rows: Row[],
  matches: StandingsMatch[],
  order: readonly Tiebreak[] = DEFAULT_TIEBREAK_ORDER,
) {
  const differences = new Map<string, number>();
  const games = new Map<string, number>();
  for (const match of matches) {
    for (const [players, difference] of [[match.pairA, match.scoreA - match.scoreB], [match.pairB, match.scoreB - match.scoreA]] as const) {
      for (const id of players) {
        differences.set(id, (differences.get(id) ?? 0) + difference);
        games.set(id, (games.get(id) ?? 0) + 1);
      }
    }
  }
  const entries = rows.map(row => ({
    ...row,
    pointDiff: differences.get(row.participantId) ?? 0,
    played: games.get(row.participantId) ?? row.wins + row.losses,
  }));

  let groups = [entries];
  for (const criterion of ["points", ...order] as const) {
    groups = groups.flatMap(group => {
      if (group.length < 2) return [group];
      const headToHead = new Map(group.map(row => [row.participantId, 0]));
      if (criterion === "head_to_head") {
        // Count each opposing tied player; partnerships never contribute.
        for (const match of matches) {
          for (const a of match.pairA) for (const b of match.pairB) {
            if (!headToHead.has(a) || !headToHead.has(b)) continue;
            const difference = match.scoreA - match.scoreB;
            headToHead.set(a, headToHead.get(a)! + difference);
            headToHead.set(b, headToHead.get(b)! - difference);
          }
        }
      }
      const buckets = new Map<number, typeof entries>();
      for (const row of group) {
        const value = criterion === "head_to_head" ? headToHead.get(row.participantId)! :
          criterion === "point_diff" ? row.pointDiff : row[criterion];
        const bucket = buckets.get(value) ?? [];
        bucket.push(row);
        buckets.set(value, bucket);
      }
      return [...buckets.entries()].sort(([a], [b]) => b - a).map(([, bucket]) => bucket);
    });
  }

  let position = 1;
  return groups.flatMap(group => {
    const rank = position;
    position += group.length;
    return [...group].sort((a, b) => a.participantId < b.participantId ? -1 : a.participantId > b.participantId ? 1 : 0)
      .map(row => ({ ...row, rank, tied: group.length > 1 }));
  });
}
