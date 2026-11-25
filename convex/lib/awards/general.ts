import type { Model } from "./model";
import type { AwardCandidate, EngineMatch } from "./types";
import {
  best,
  competitorWinner,
  makeAward,
  pairWinner,
  plural,
  roundLabel,
  scoreText,
  unitOf,
  type Scored,
} from "./pick";

// Awards that apply to every format and count every match (including Double
// Americano finals). Draws are neither wins nor losses.

const competitors = (m: Model) => [...m.competitors.values()];

export function invincible(m: Model): AwardCandidate | null {
  const unbeaten = competitors(m)
    .filter((c) => c.appearances.length >= 3 && c.appearances.every((a) => a.result !== "loss"))
    .map((c) => ({ item: c, value: c.appearances.length, at: c.appearances[0].matchIndex }));
  if (unbeaten.length === 0) return null;
  const winners = unbeaten.sort((a, b) => b.value - a.value || a.at - b.at).slice(0, 4);
  const most = winners[0].value;
  return makeAward(
    {
      id: "invincible",
      title: "The Invincible",
      emoji: "🛡️",
      priority: 2,
      short: "Invincible",
      listStyle: true,
    },
    winners.map((w) => competitorWinner(w.item)),
    `Unbeaten in ${plural(most, "match", "matches")}`,
  );
}

export function onFire(m: Model): AwardCandidate | null {
  const streaks: Scored[] = [];
  for (const c of competitors(m)) {
    let run = 0;
    let bestRun = 0;
    let at = Infinity;
    for (const a of c.appearances) {
      run = a.result === "win" ? run + 1 : 0;
      if (run > bestRun) {
        bestRun = run;
        at = a.matchIndex;
      }
    }
    if (bestRun >= 3) streaks.push({ item: c, value: bestRun, at });
  }
  const winners = best(streaks);
  if (winners.length === 0) return null;
  return makeAward(
    { id: "onFire", title: "On Fire", emoji: "🔥", priority: 7, short: "On Fire" },
    winners.map((w) => competitorWinner(w.item)),
    `${winners[0].value} wins in a row`,
  );
}

function closeResults(m: Model, result: "win" | "loss") {
  const entries: Scored[] = [];
  for (const c of competitors(m)) {
    const close = c.appearances.filter(
      (a) => a.result === result && Math.abs(a.scoreFor - a.scoreAgainst) <= m.close,
    );
    if (close.length >= 2)
      entries.push({ item: c, value: close.length, at: close[close.length - 1].matchIndex });
  }
  return best(entries);
}

const closeText = (m: Model, n: number, what: "wins" | "losses") =>
  `${n} ${what} by ${plural(m.close, unitOf(m))} or fewer`;

export function clutchPlayer(m: Model): AwardCandidate | null {
  const winners = closeResults(m, "win");
  if (winners.length === 0) return null;
  return makeAward(
    { id: "clutchPlayer", title: "Clutch Player", emoji: "🧊", priority: 11, short: "Clutch" },
    winners.map((w) => competitorWinner(w.item)),
    closeText(m, winners[0].value, "wins"),
  );
}

export function unluckyOne(m: Model): AwardCandidate | null {
  const winners = closeResults(m, "loss");
  if (winners.length === 0) return null;
  return makeAward(
    { id: "unluckyOne", title: "The Unlucky One", emoji: "💔", priority: 12, short: "Unlucky" },
    winners.map((w) => competitorWinner(w.item)),
    closeText(m, winners[0].value, "losses"),
  );
}

export function demolitionJob(m: Model): AwardCandidate | null {
  const entries: Scored<EngineMatch>[] = m.input.matches
    .map((match, index) => ({
      item: match,
      value: Math.abs(match.scoreA - match.scoreB),
      at: index,
    }))
    .filter((e) => e.value > 0);
  const winners = best(entries);
  if (winners.length === 0) return null;
  const top = winners[0].item;
  return makeAward(
    {
      id: "demolitionJob",
      title: "Demolition Job",
      emoji: "💥",
      priority: 13,
      short: "Demolition",
    },
    winners.map((w) => pairWinner(m, w.item.scoreA > w.item.scoreB ? w.item.pairA : w.item.pairB)),
    `${scoreText(top.scoreA, top.scoreB)} · ${roundLabel(m, top)}`,
  );
}

export function warrior(m: Model): AwardCandidate | null {
  if (!m.pointsScored) return null;
  const entries: Scored[] = [];
  for (const c of competitors(m)) {
    const losses = c.appearances.filter((a) => a.result === "loss");
    const points = losses.reduce((sum, a) => sum + a.scoreFor, 0);
    if (points > 0)
      entries.push({ item: c, value: points, at: losses[losses.length - 1].matchIndex });
  }
  const winners = best(entries);
  if (winners.length === 0) return null;
  return makeAward(
    { id: "warrior", title: "The Warrior", emoji: "🦾", priority: 19, short: "Warrior" },
    winners.map((w) => competitorWinner(w.item)),
    `${winners[0].value} points in losing matches`,
  );
}
