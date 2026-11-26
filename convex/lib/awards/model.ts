import type { EngineInput, EngineMatch } from "./types";

// Per-competitor view of a tournament. A competitor is a single player in
// rotating-partner formats, or a fixed pair in fixed-pair formats.

export type Result = "win" | "loss" | "draw";

export type Appearance = {
  match: EngineMatch;
  // Position of the match in overall match order.
  matchIndex: number;
  // 1-based round for the match's stage (group / final). Americano: the
  // position in this competitor's own matches, which counts partnership
  // rounds even when a round is played in several waves. Other formats: the
  // real round (players/pairs can sit out, so own-match counts would drift).
  roundIndex: number;
  scoreFor: number;
  scoreAgainst: number;
  result: Result;
  partnerIds: string[];
};

export type Competitor = {
  key: string;
  name: string;
  playerIds: string[];
  appearances: Appearance[];
};

export type Model = {
  input: EngineInput;
  close: number;
  pointsScored: boolean;
  fixedPairs: boolean;
  competitors: Map<string, Competitor>;
  nameOf(playerIds: string[]): string;
  competitorKeysOf(pair: readonly [string, string]): string[];
};

const FIXED_PAIR_FORMATS = ["round_robin", "knockout", "king_of_the_court", "snakes_and_ladders"];

export function closeMargin(pointsToWin?: number) {
  return pointsToWin === undefined ? 2 : Math.max(1, Math.round(pointsToWin * 0.1));
}

// True when scores are points rather than games (e.g. a 6-game set).
export function isPointsScored(scoringMode: EngineInput["scoringMode"], pointsToWin?: number) {
  if (scoringMode === "shared_total" || scoringMode === "time_based") return true;
  return (pointsToWin ?? 24) >= 10;
}

export function resultOf(scoreFor: number, scoreAgainst: number): Result {
  return scoreFor > scoreAgainst ? "win" : scoreFor < scoreAgainst ? "loss" : "draw";
}

export function buildModel(input: EngineInput): Model {
  const fixedPairs = FIXED_PAIR_FORMATS.includes(input.format);
  const names = new Map(input.players.map((p) => [p.id, p.name]));
  const nameOf = (ids: string[]) => ids.map((id) => names.get(id) ?? "Unknown").join(" / ");
  const pairKey = (pair: readonly string[]) => [...pair].sort().join("|");
  const competitorKeysOf = (pair: readonly [string, string]) =>
    fixedPairs ? [pairKey(pair)] : [...pair];

  const matches = [...input.matches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.court - b.court,
  );
  const competitors = new Map<string, Competitor>();
  const counters = new Map<string, number>();
  const partnershipRounds = input.format === "americano";
  const realRound = new Map<string, number>();
  for (const stage of ["group", "final"] as const)
    [...new Set(matches.filter((x) => x.stage === stage).map((x) => x.roundNumber))]
      .sort((a, b) => a - b)
      .forEach((roundNumber, i) => realRound.set(`${stage}:${roundNumber}`, i + 1));

  matches.forEach((match, matchIndex) => {
    for (const [pair, scoreFor, scoreAgainst] of [
      [match.pairA, match.scoreA, match.scoreB],
      [match.pairB, match.scoreB, match.scoreA],
    ] as const) {
      const entries = fixedPairs
        ? [{ key: pairKey(pair), playerIds: [...pair].sort(), partnerIds: [] as string[] }]
        : pair.map((id) => ({
            key: id,
            playerIds: [id],
            partnerIds: pair.filter((other) => other !== id),
          }));
      for (const { key, playerIds, partnerIds } of entries) {
        const competitor = competitors.get(key) ?? {
          key,
          name: nameOf(playerIds),
          playerIds,
          appearances: [],
        };
        const counterKey = `${key}:${match.stage}`;
        const ownIndex = (counters.get(counterKey) ?? 0) + 1;
        counters.set(counterKey, ownIndex);
        const roundIndex = partnershipRounds
          ? ownIndex
          : realRound.get(`${match.stage}:${match.roundNumber}`)!;
        competitor.appearances.push({
          match,
          matchIndex,
          roundIndex,
          scoreFor,
          scoreAgainst,
          result: resultOf(scoreFor, scoreAgainst),
          partnerIds,
        });
        competitors.set(key, competitor);
      }
    }
  });

  return {
    input: { ...input, matches },
    close: closeMargin(input.pointsToWin),
    pointsScored: isPointsScored(input.scoringMode, input.pointsToWin),
    fixedPairs,
    competitors,
    nameOf,
    competitorKeysOf,
  };
}
