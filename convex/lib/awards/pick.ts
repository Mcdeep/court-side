import type { Competitor, Model } from "./model";
import type { AwardCandidate, EngineMatch } from "./types";

export type Scored<T = Competitor> = { item: T; value: number; at: number };

// The entries with the best value, in the order they reached it (`at`),
// capped at `limit` co-winners.
export function best<T>(entries: Scored<T>[], prefer: "max" | "min" = "max", limit = 2) {
  if (entries.length === 0) return [];
  const values = entries.map((e) => e.value);
  const target = prefer === "max" ? Math.max(...values) : Math.min(...values);
  return entries
    .filter((e) => e.value === target)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}

export type AwardMeta = {
  id: string;
  title: string;
  emoji: string;
  priority: number;
  short: string;
  listStyle?: boolean;
};

export function makeAward(
  meta: AwardMeta,
  winners: { name: string; ids: string[] }[],
  detail: string,
): AwardCandidate {
  return {
    id: meta.id,
    title: meta.title,
    emoji: meta.emoji,
    short: meta.short,
    priority: meta.priority,
    ...(meta.listStyle ? { listStyle: true } : {}),
    winners: winners.map((w) => w.name),
    winnerIds: [...new Set(winners.flatMap((w) => w.ids))],
    detail,
  };
}

export const competitorWinner = (c: Competitor) => ({ name: c.name, ids: c.playerIds });

export const pairWinner = (m: Model, pair: readonly string[]) => ({
  name: m.nameOf([...pair]),
  ids: [...pair],
});

// "Round 4" (partnership round) or "Final 2".
export function roundLabel(m: Model, match: EngineMatch) {
  if (match.stage === "final") return `Final ${(match.finalIndex ?? 0) + 1}`;
  const key = m.competitorKeysOf(match.pairA)[0];
  const appearance = m.competitors.get(key)?.appearances.find((a) => a.match === match);
  return `Round ${appearance?.roundIndex ?? match.roundNumber}`;
}

export const scoreText = (a: number, b: number) => `${Math.max(a, b)}–${Math.min(a, b)}`;

export const plural = (n: number, word: string, many = `${word}s`) =>
  `${n} ${n === 1 ? word : many}`;

export const unitOf = (m: Model) => (m.pointsScored ? "point" : "game");
