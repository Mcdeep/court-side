import type { Model } from "./model";
import type { AwardCandidate, EngineMatch } from "./types";
import { best, competitorWinner, makeAward, pairWinner, type Scored } from "./pick";

// Double Americano awards (group stage + crossover finals).

const finals = (m: Model) => m.input.matches.filter((x) => x.stage === "final");

const groupApps = (m: Model, id: string) =>
  m.competitors.get(id)?.appearances.filter((a) => a.match.stage === "group") ?? [];

const groupPoints = (m: Model, id: string) =>
  groupApps(m, id).reduce((total, a) => total + a.scoreFor, 0);

const winnersOf = (x: EngineMatch) => (x.scoreA > x.scoreB ? x.pairA : x.pairB);
const losersOf = (x: EngineMatch) => (x.scoreA > x.scoreB ? x.pairB : x.pairA);

const groupOf = (m: Model, id: string) => m.input.players.find((p) => p.id === id)?.group;

const groupRank = (m: Model, id: string) =>
  m.input.finalStandings.find((s) => s.participantIds.includes(id))?.groupRank;

const finalOne = (m: Model) => finals(m).find((x) => x.finalIndex === 0 && x.scoreA !== x.scoreB);

export function flawless(m: Model): AwardCandidate | null {
  if (!m.input.double) return null;
  const final = finalOne(m);
  if (!final) return null;
  const ids = winnersOf(final).filter(
    (id) => groupRank(m, id) === 1 && groupApps(m, id).every((a) => a.result !== "loss"),
  );
  if (ids.length === 0) return null;
  return makeAward(
    {
      id: "flawless",
      title: "Flawless",
      emoji: "🌟",
      priority: 1,
      short: "Flawless",
      listStyle: true,
    },
    ids.map((id) => competitorWinner(m.competitors.get(id)!)),
    `Unbeaten in Group ${groupOf(m, ids[0])} and won Final 1`,
  );
}

export function finalsUpset(m: Model): AwardCandidate | null {
  if (!m.input.double) return null;
  const entries: Scored<EngineMatch>[] = [];
  for (const final of finals(m)) {
    if (final.scoreA === final.scoreB) continue;
    const sum = (pair: readonly string[]) => pair.reduce((t, id) => t + groupPoints(m, id), 0);
    const gap = sum(losersOf(final)) - sum(winnersOf(final));
    if (gap > 0) entries.push({ item: final, value: gap, at: final.finalIndex ?? 0 });
  }
  const winners = best(entries);
  if (winners.length === 0) return null;
  const top = winners[0];
  return makeAward(
    { id: "finalsUpset", title: "Finals Upset", emoji: "😱", priority: 3, short: "Upset" },
    winners.map((w) => pairWinner(m, winnersOf(w.item))),
    `Won Final ${(top.item.finalIndex ?? 0) + 1} with ${top.value} fewer group points`,
  );
}

export function redemption(m: Model): AwardCandidate | null {
  if (!m.input.double) return null;
  const redeemed: { id: string; final: number }[] = [];
  for (const final of finals(m)) {
    if (final.scoreA === final.scoreB) continue;
    for (const id of winnersOf(final)) {
      const last = groupApps(m, id).at(-1);
      if (last?.result === "loss") redeemed.push({ id, final: (final.finalIndex ?? 0) + 1 });
    }
  }
  if (redeemed.length === 0) return null;
  const shown = redeemed.slice(0, 4);
  const sameFinal = shown.every((r) => r.final === shown[0].final);
  return makeAward(
    {
      id: "redemption",
      title: "Redemption",
      emoji: "🔁",
      priority: 6,
      short: "Redemption",
      listStyle: true,
    },
    shown.map((r) => competitorWinner(m.competitors.get(r.id)!)),
    `Lost their last group game, then won ${sameFinal ? `Final ${shown[0].final}` : "their final"}`,
  );
}

export function dominator(m: Model): AwardCandidate | null {
  if (!m.input.double) return null;
  const final = finalOne(m);
  const champions = new Set<string>(final ? winnersOf(final) : []);
  const top = best(
    [...m.competitors.values()].map((c) => ({
      item: c,
      value: groupPoints(m, c.key),
      at: c.appearances[0]?.matchIndex ?? 0,
    })),
  ).filter((entry) => !champions.has(entry.item.key));
  if (top.length === 0) return null;
  return makeAward(
    { id: "dominator", title: "The Dominator", emoji: "🏆", priority: 16, short: "Dominator" },
    top.map((t) => competitorWinner(t.item)),
    `Top scorer: ${top[0].value} group points`,
  );
}
