// Test-only helpers for building award engine inputs. Imported only by
// convex/lib/awards/*.test.ts.
import { DEFAULT_TIEBREAK_ORDER } from "../tiebreaks";
import { rankStandings } from "../standings";
import type { EngineInput, EngineMatch, EngineStanding, Format } from "./types";

export type Game = [string, string, string, string, number, number];

type Options = {
  scoringMode?: EngineInput["scoringMode"];
  pointsToWin?: number;
  finalStandings?: EngineStanding[];
};

const nameOf = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

function toMatch(game: Game, roundNumber: number, court: number): EngineMatch {
  const [a1, a2, b1, b2, scoreA, scoreB] = game;
  return {
    roundNumber,
    stage: "group",
    court,
    pairA: [a1, a2],
    pairB: [b1, b2],
    scoreA,
    scoreB,
  };
}

function playerIds(matches: EngineMatch[]) {
  const ids: string[] = [];
  for (const m of matches)
    for (const id of [...m.pairA, ...m.pairB]) if (!ids.includes(id)) ids.push(id);
  return ids;
}

// Ranks units (single players, or fixed pairs) by accumulated points with the
// default tiebreak order. Draws are neither wins nor losses.
function rank(units: string[][], matches: EngineMatch[]) {
  const rows = units.map((ids) => ({ participantId: ids[0], ids, points: 0, wins: 0, losses: 0 }));
  const byId = new Map(rows.flatMap((row) => row.ids.map((id) => [id, row] as const)));
  for (const m of matches)
    for (const [pair, scoreFor, against] of [
      [m.pairA, m.scoreA, m.scoreB],
      [m.pairB, m.scoreB, m.scoreA],
    ] as const) {
      const seen = new Set<object>();
      for (const id of pair) {
        const row = byId.get(id)!;
        if (seen.has(row)) continue;
        seen.add(row);
        row.points += scoreFor;
        row.wins += Number(scoreFor > against);
        row.losses += Number(scoreFor < against);
      }
    }
  const standingsMatches = matches.map((m) => ({
    pairA: m.pairA.map((id) => byId.get(id)!.participantId),
    pairB: m.pairB.map((id) => byId.get(id)!.participantId),
    scoreA: m.scoreA,
    scoreB: m.scoreB,
  }));
  return rankStandings(rows, standingsMatches, DEFAULT_TIEBREAK_ORDER);
}

export function americano(rounds: Game[][], opts: Options = {}): EngineInput {
  const matches = rounds.flatMap((games, r) => games.map((g, c) => toMatch(g, r + 1, c + 1)));
  const ids = playerIds(matches);
  return {
    format: "americano",
    double: false,
    scoringMode: opts.scoringMode ?? "shared_total",
    pointsToWin: opts.pointsToWin ?? 20,
    rankingOrder: DEFAULT_TIEBREAK_ORDER,
    players: ids.map((id) => ({ id, name: nameOf(id) })),
    matches,
    finalStandings:
      opts.finalStandings ??
      rank(
        ids.map((id) => [id]),
        matches,
      ).map((row) => ({ participantIds: row.ids, rank: row.rank })),
  };
}

export function fixedPairs(format: Format, rounds: Game[][], opts: Options = {}): EngineInput {
  const matches = rounds.flatMap((games, r) => games.map((g, c) => toMatch(g, r + 1, c + 1)));
  const pairs: string[][] = [];
  for (const m of matches)
    for (const pair of [m.pairA, m.pairB])
      if (!pairs.some((p) => p.includes(pair[0]))) pairs.push([...pair]);
  return {
    format,
    double: false,
    scoringMode: opts.scoringMode ?? "first_to",
    pointsToWin: opts.pointsToWin ?? 24,
    rankingOrder: ["points"],
    players: pairs.flatMap((pair, i) =>
      pair.map((id) => ({ id, name: nameOf(id), teamId: `team${i}` })),
    ),
    matches,
    finalStandings:
      opts.finalStandings ??
      rank(pairs, matches).map((row) => ({ participantIds: row.ids, rank: row.rank })),
  };
}

// Group rounds list both groups' matches for a partnership round in the order
// [group1 match 1, group1 match 2, group2 match 1, group2 match 2]. With
// `waves`, each group's two matches are played in consecutive waves (2–3
// court schedule), so round r becomes waves 2r-1 and 2r.
export function doubleAmericano(spec: {
  groups: { 1: string[]; 2: string[] };
  group: Game[][];
  finals: Game[];
  waves?: boolean;
  pointsToWin?: number;
}): EngineInput {
  const matches: EngineMatch[] = [];
  spec.group.forEach((games, r) =>
    games.forEach((g, i) =>
      matches.push(
        spec.waves ? toMatch(g, 2 * r + 1 + (i % 2), i < 2 ? 1 : 2) : toMatch(g, r + 1, i + 1),
      ),
    ),
  );
  const lastGroupRound = Math.max(...matches.map((m) => m.roundNumber));
  spec.finals.forEach((g, i) =>
    matches.push({ ...toMatch(g, lastGroupRound + 1, i + 1), stage: "final", finalIndex: i }),
  );
  matches.sort((a, b) => a.roundNumber - b.roundNumber || a.court - b.court);

  const groupMatches = matches.filter((m) => m.stage === "group");
  const placements = new Map<string, number>();
  for (const m of matches.filter((x) => x.stage === "final")) {
    const aWins = m.scoreA > m.scoreB;
    const base = m.finalIndex! * 2 + 1;
    for (const id of m.pairA) placements.set(id, base + Number(!aWins));
    for (const id of m.pairB) placements.set(id, base + Number(aWins));
  }
  const finalStandings = ([1, 2] as const).flatMap((group) => {
    const ids = spec.groups[group];
    const inGroup = groupMatches.filter((m) => ids.includes(m.pairA[0]));
    return rank(
      ids.map((id) => [id]),
      inGroup,
    ).map((row) => ({
      participantIds: row.ids,
      groupRank: row.rank,
      rank: placements.get(row.ids[0]) ?? row.rank,
    }));
  });
  return {
    format: "americano",
    double: true,
    scoringMode: "shared_total",
    pointsToWin: spec.pointsToWin ?? 20,
    rankingOrder: DEFAULT_TIEBREAK_ORDER,
    players: ([1, 2] as const).flatMap((group) =>
      spec.groups[group].map((id) => ({ id, name: nameOf(id), group })),
    ),
    matches,
    finalStandings,
  };
}

// Standard 8-player Americano schedule (each player partners every other once).
export const EIGHT = ["a", "b", "c", "d", "e", "f", "g", "h"];
const TEMPLATE: [number, number, number, number][][] = [
  [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
  ],
  [
    [0, 2, 4, 6],
    [1, 3, 5, 7],
  ],
  [
    [0, 3, 5, 6],
    [1, 2, 4, 7],
  ],
  [
    [0, 4, 1, 5],
    [2, 6, 3, 7],
  ],
  [
    [0, 5, 2, 7],
    [1, 4, 3, 6],
  ],
  [
    [0, 6, 3, 5],
    [1, 7, 2, 4],
  ],
  [
    [0, 7, 1, 6],
    [2, 5, 3, 4],
  ],
];

// Builds a 7-round, 8-player schedule over `ids`, scoring each match with
// `score(roundIndex0, court0)` → [scoreA, scoreB].
export function eightPlayerRounds(
  ids: string[],
  score: (round: number, court: number) => [number, number],
  rounds = 7,
): Game[][] {
  return TEMPLATE.slice(0, rounds).map((games, r) =>
    games.map(([a1, a2, b1, b2], c) => {
      const [sA, sB] = score(r, c);
      return [ids[a1], ids[a2], ids[b1], ids[b2], sA, sB] as Game;
    }),
  );
}
