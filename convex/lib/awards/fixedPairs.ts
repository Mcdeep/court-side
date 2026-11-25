import type { Competitor, Model } from "./model";
import type { AwardCandidate } from "./types";
import { best, competitorWinner, makeAward, plural, unitOf, type Scored } from "./pick";

// Awards for fixed-pair formats; every competitor is a pair. Court 1 is the
// top court.

const pairs = (m: Model) => [...m.competitors.values()];

export function longestReign(m: Model): AwardCandidate | null {
  const entries: Scored[] = [];
  for (const c of pairs(m)) {
    let run = 0;
    let bestRun = 0;
    let at = 0;
    let lastRound = -Infinity;
    for (const a of c.appearances) {
      const reigning = a.match.court === 1 && a.result === "win";
      run = reigning ? (a.match.roundNumber === lastRound + 1 ? run + 1 : 1) : 0;
      lastRound = reigning ? a.match.roundNumber : -Infinity;
      if (run > bestRun) {
        bestRun = run;
        at = a.matchIndex;
      }
    }
    if (bestRun >= 2) entries.push({ item: c, value: bestRun, at });
  }
  const winners = best(entries);
  if (winners.length === 0) return null;
  return makeAward(
    { id: "longestReign", title: "Longest Reign", emoji: "👑", priority: 8, short: "Reign" },
    winners.map((w) => competitorWinner(w.item)),
    `Held court 1 for ${winners[0].value} rounds`,
  );
}

export function summit(m: Model): AwardCandidate | null {
  const rounds = new Set(m.input.matches.map((x) => x.roundNumber)).size;
  if (rounds < 3) return null;
  const entries: Scored[] = pairs(m)
    .map((c) => {
      const top = c.appearances.filter((a) => a.match.court === 1);
      return { item: c, value: top.length, at: top.at(-1)?.matchIndex ?? 0 };
    })
    .filter((e) => e.value > 0);
  const winners = best(entries);
  if (winners.length === 0) return null;
  return makeAward(
    { id: "summit", title: "Summit", emoji: "⛰️", priority: 9, short: "Summit" },
    winners.map((w) => competitorWinner(w.item)),
    `${plural(winners[0].value, "round")} on the top court`,
  );
}

export function biggestClimb(m: Model): AwardCandidate | null {
  const entries: Scored<{ c: Competitor; from: number; to: number }>[] = [];
  for (const c of pairs(m)) {
    let worst = -Infinity;
    let climb = { value: 0, from: 0, to: 0, at: 0 };
    for (const a of c.appearances) {
      const court = a.match.court;
      if (worst - court > climb.value)
        climb = { value: worst - court, from: worst, to: court, at: a.matchIndex };
      worst = Math.max(worst, court);
    }
    if (climb.value >= 2)
      entries.push({
        item: { c, from: climb.from, to: climb.to },
        value: climb.value,
        at: climb.at,
      });
  }
  const winners = best(entries);
  if (winners.length === 0) return null;
  const { from, to } = winners[0].item;
  return makeAward(
    { id: "biggestClimb", title: "Biggest Climb", emoji: "🪜", priority: 10, short: "Climb" },
    winners.map((w) => competitorWinner(w.item.c)),
    `Climbed from court ${from} to court ${to}`,
  );
}

export function dreamTeam(m: Model): AwardCandidate | null {
  const entries: Scored[] = pairs(m)
    .map((c) => ({
      item: c,
      value: c.appearances.reduce((t, a) => t + a.scoreFor - a.scoreAgainst, 0),
      at: c.appearances.at(-1)?.matchIndex ?? 0,
    }))
    .filter((e) => e.value > 0);
  const winners = best(entries);
  if (winners.length === 0) return null;
  const played = winners[0].item.appearances.length;
  return makeAward(
    { id: "dreamTeam", title: "The Dream Team", emoji: "🤝", priority: 14, short: "Dream Team" },
    winners.map((w) => competitorWinner(w.item)),
    `+${winners[0].value} across ${plural(played, "match", "matches")}`,
  );
}

export function roadToGlory(m: Model): AwardCandidate | null {
  // Only once the final has been played: the last round is a single match.
  const final = m.input.matches.at(-1);
  if (!final || final.scoreA === final.scoreB) return null;
  if (m.input.matches.filter((x) => x.roundNumber === final.roundNumber).length !== 1) return null;
  const [key] = m.competitorKeysOf(final.scoreA > final.scoreB ? final.pairA : final.pairB);
  const champion = m.competitors.get(key);
  if (!champion) return null;
  const wins = champion.appearances.filter((a) => a.result === "win");
  const total = wins.reduce((t, a) => t + a.scoreFor - a.scoreAgainst, 0);
  return makeAward(
    {
      id: "roadToGlory",
      title: "Road to Glory",
      emoji: "👊",
      priority: 15,
      short: "Road to Glory",
    },
    [competitorWinner(champion)],
    `Won ${plural(wins.length, "match", "matches")} by ${plural(total, unitOf(m))} in total`,
  );
}
