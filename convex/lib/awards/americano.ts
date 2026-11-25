import { rankStandings, type StandingsMatch } from "../standings";
import type { Model } from "./model";
import type { AwardCandidate, EngineMatch } from "./types";
import { best, competitorWinner, makeAward, pairWinner, unitOf, type Scored } from "./pick";

// Awards for rotating-partner formats (Americano, Mexicano, Double Americano).
// All of them use group-stage matches only.

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const groupAppearances = (m: Model, key: string) =>
  m.competitors.get(key)?.appearances.filter((a) => a.match.stage === "group") ?? [];

// Max group round index across all competitors.
export function groupRounds(m: Model) {
  let max = 0;
  for (const c of m.competitors.values())
    for (const a of c.appearances) if (a.match.stage === "group") max = Math.max(max, a.roundIndex);
  return max;
}

function roundOf(m: Model, match: EngineMatch) {
  return (
    groupAppearances(m, match.pairA[0]).find((a) => a.match === match)?.roundIndex ??
    match.roundNumber
  );
}

const groupOf = (m: Model, id: string) => m.input.players.find((p) => p.id === id)?.group;

// Rank of every player after each competitor's first `k` group rounds, using
// the tournament's ranking order (Double Americano ranks within each group).
// Draws are neither wins nor losses.
export function standingsAfter(m: Model, k: number): Map<string, number> {
  const differential = m.input.leaderboardScoringMode === "differential";
  const included = m.input.matches.filter((x) => x.stage === "group" && roundOf(m, x) <= k);
  const rows = new Map(
    [...m.competitors.keys()].map((id) => [
      id,
      { participantId: id, points: 0, wins: 0, losses: 0 },
    ]),
  );
  for (const x of included)
    for (const [pair, scoreFor, against] of [
      [x.pairA, x.scoreA, x.scoreB],
      [x.pairB, x.scoreB, x.scoreA],
    ] as const)
      for (const id of pair) {
        const row = rows.get(id)!;
        row.points += differential ? scoreFor - against : scoreFor;
        row.wins += Number(scoreFor > against);
        row.losses += Number(scoreFor < against);
      }
  const matches: StandingsMatch[] = included.map((x) => ({
    pairA: [...x.pairA],
    pairB: [...x.pairB],
    scoreA: x.scoreA,
    scoreB: x.scoreB,
  }));
  const groups = m.input.double ? [1, 2] : [undefined];
  const ranks = new Map<string, number>();
  for (const group of groups) {
    const groupRows = [...rows.values()].filter(
      (row) => group === undefined || groupOf(m, row.participantId) === group,
    );
    for (const row of rankStandings(groupRows, matches, m.input.rankingOrder))
      ranks.set(row.participantId, row.rank);
  }
  return ranks;
}

function finalRank(m: Model, id: string) {
  const standing = m.input.finalStandings.find((s) => s.participantIds.includes(id));
  if (!standing) return undefined;
  return m.input.double ? standing.groupRank : standing.rank;
}

export function comebackKing(m: Model): AwardCandidate | null {
  const rounds = groupRounds(m);
  if (rounds < 4) return null;
  const halfway = standingsAfter(m, Math.floor(rounds / 2));
  const entries: Scored<{ id: string; from: number; to: number }>[] = [];
  for (const id of m.competitors.keys()) {
    const from = halfway.get(id);
    const to = finalRank(m, id);
    if (from === undefined || to === undefined || from - to < 2) continue;
    entries.push({ item: { id, from, to }, value: from - to, at: to });
  }
  const winners = best(entries);
  if (winners.length === 0) return null;
  const { id, from, to } = winners[0].item;
  const group = m.input.double ? groupOf(m, id) : undefined;
  return makeAward(
    { id: "comebackKing", title: "Comeback King", emoji: "📈", priority: 4, short: "Comeback" },
    winners.map((w) => competitorWinner(m.competitors.get(w.item.id)!)),
    `Climbed from ${ordinal(from)} to ${ordinal(to)}${group ? ` in Group ${group}` : ""}`,
  );
}

export function giantSlayer(m: Model): AwardCandidate | null {
  if (groupRounds(m) < 4) return null;
  const cache = new Map<number, Map<string, number>>();
  const ranksBefore = (k: number) => {
    if (!cache.has(k)) cache.set(k, standingsAfter(m, k - 1));
    return cache.get(k)!;
  };
  const entries: Scored<{ match: EngineMatch; round: number; won: string[]; lost: string[] }>[] =
    [];
  m.input.matches.forEach((match, index) => {
    if (match.stage !== "group" || match.scoreA === match.scoreB) return;
    const round = roundOf(m, match);
    if (round < 2) return;
    const ranks = ranksBefore(round);
    const [won, lost] =
      match.scoreA > match.scoreB ? [match.pairA, match.pairB] : [match.pairB, match.pairA];
    const sum = (pair: readonly string[]) => pair.reduce((t, id) => t + (ranks.get(id) ?? 0), 0);
    const gap = sum(won) - sum(lost);
    if (gap >= 3)
      entries.push({
        item: { match, round, won: [...won], lost: [...lost] },
        value: gap,
        at: index,
      });
  });
  const winners = best(entries);
  if (winners.length === 0) return null;
  const { round, won, lost } = winners[0].item;
  const ranks = ranksBefore(round);
  const places = (pair: string[]) => pair.map((id) => ordinal(ranks.get(id)!)).join(" & ");
  return makeAward(
    { id: "giantSlayer", title: "Giant Slayer", emoji: "🎯", priority: 5, short: "Giant Slayer" },
    winners.map((w) => pairWinner(m, w.item.won)),
    `From ${places(won)}, beat ${m.nameOf(lost)} (${places(lost)}) · Round ${round}`,
  );
}

export function consistent(m: Model): AwardCandidate | null {
  const rounds = groupRounds(m);
  if (rounds < 5) return null;
  const entries: Scored<{ key: string; low: number; high: number }>[] = [];
  for (const c of m.competitors.values()) {
    const scores = groupAppearances(m, c.key).map((a) => a.scoreFor);
    if (scores.length < rounds) continue;
    const mean = scores.reduce((t, s) => t + s, 0) / scores.length;
    const deviation = Math.sqrt(scores.reduce((t, s) => t + (s - mean) ** 2, 0) / scores.length);
    entries.push({
      item: { key: c.key, low: Math.min(...scores), high: Math.max(...scores) },
      value: deviation,
      at: c.appearances[0].matchIndex,
    });
  }
  const winners = best(entries, "min");
  if (winners.length === 0) return null;
  const { low, high } = winners[0].item;
  return makeAward(
    {
      id: "consistent",
      title: "Mr / Ms Consistent",
      emoji: "📏",
      priority: 17,
      short: "Consistent",
    },
    winners.map((w) => competitorWinner(m.competitors.get(w.item.key)!)),
    low === high ? `Scored ${low} every round` : `Scored ${low}–${high} every round`,
  );
}

export function strongFinisher(m: Model): AwardCandidate | null {
  if (groupRounds(m) < 6) return null;
  const entries: Scored[] = [];
  for (const c of m.competitors.values()) {
    const last = groupAppearances(m, c.key).slice(-3);
    if (last.length < 3) continue;
    entries.push({
      item: c,
      value: last.reduce((t, a) => t + a.scoreFor, 0),
      at: last[2].matchIndex,
    });
  }
  const winners = best(entries);
  if (winners.length === 0) return null;
  return makeAward(
    {
      id: "strongFinisher",
      title: "Strong Finisher",
      emoji: "🏁",
      priority: 18,
      short: "Strong Finisher",
    },
    winners.map((w) => competitorWinner(w.item)),
    `${winners[0].value} ${unitOf(m)}s in the last 3 rounds`,
  );
}
