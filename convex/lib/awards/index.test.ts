import { describe, expect, test } from "vitest";
import { americano, doubleAmericano, EIGHT, eightPlayerRounds, type Game } from "./fixtures";
import { comebackKing } from "./americano";
import { flawless } from "./double";
import { dreamTeam } from "./fixedPairs";
import { computeAwards, eligibleAwards, MAX_AWARDS, selectAwards } from "./index";
import type { AwardCandidate } from "./types";

const candidate = (priority: number, winnerIds: string[]): AwardCandidate => ({
  id: `award${priority}`,
  title: `Award ${priority}`,
  emoji: "⭐",
  short: `A${priority}`,
  detail: "",
  priority,
  winners: winnerIds,
  winnerIds,
});

describe("award selection", () => {
  test("team clash returns no awards", () => {
    expect(eligibleAwards("team_clash", false)).toEqual([]);
    const input = americano(eightPlayerRounds(EIGHT, () => [12, 8]));
    expect(computeAwards({ ...input, format: "team_clash" })).toEqual([]);
  });

  test("eligibility by format", () => {
    expect(eligibleAwards("round_robin", false)).toContain(dreamTeam);
    expect(eligibleAwards("round_robin", false)).not.toContain(comebackKing);
    expect(eligibleAwards("americano", true)).toContain(flawless);
    expect(eligibleAwards("americano", false)).not.toContain(flawless);
    expect(eligibleAwards("mexicano", false)).toContain(comebackKing);
  });

  test("caps at eight", () => {
    const many = Array.from({ length: 12 }, (_, i) => candidate(i + 1, [`p${i}`]));
    expect(selectAwards(many)).toHaveLength(MAX_AWARDS);
    expect(MAX_AWARDS).toBe(8);
  });

  test("prefers new winners beyond the cap", () => {
    const list = [
      ...Array.from({ length: 7 }, (_, i) => candidate(i + 1, [`p${i}`])),
      candidate(8, ["p0"]), // p0 already has award 1
      candidate(9, ["fresh"]),
    ];
    const ids = selectAwards(list).map((a) => a.id);
    expect(ids).toContain("award9");
    expect(ids).not.toContain("award8");
    // Returned in priority order, without internal fields.
    expect(ids).toEqual([...ids].sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))));
    expect(selectAwards(list)[0]).not.toHaveProperty("priority");
    expect(selectAwards(list)[0]).not.toHaveProperty("winnerIds");
  });

  test("ties show at most two co-winners", () => {
    const rounds: Game[][] = ["a", "b", "c"].flatMap((p, i) =>
      [0, 1, 2].map((k) => [[p, `x${i}${k}`, `y${i}${k}`, `z${i}${k}`, 12, 8] as Game]),
    );
    const onFire = computeAwards(americano(rounds)).find((a) => a.id === "onFire");
    expect(onFire?.winners).toEqual(["A", "B"]);
  });

  test("computeAwards end to end: double americano, priority order", () => {
    const g2 = ["i", "j", "k", "l", "m", "n", "o", "p"];
    const g1Rounds = eightPlayerRounds(EIGHT, () => [10, 10]).map((games) =>
      games.map((g) => {
        const [a1, a2, b1, b2] = g;
        if (![a1, a2, b1, b2].includes("a")) return g;
        return (
          a1 === "a" || a2 === "a" ? [a1, a2, b1, b2, 12, 8] : [a1, a2, b1, b2, 8, 12]
        ) as Game;
      }),
    );
    const g2Rounds = eightPlayerRounds(g2, () => [11, 9]);
    const awards = computeAwards(
      doubleAmericano({
        groups: { 1: EIGHT, 2: g2 },
        group: g1Rounds.map((games, r) => [...games, ...g2Rounds[r]]),
        finals: [
          ["a", "j", "i", "b", 12, 8],
          ["c", "l", "k", "d", 12, 8],
          ["e", "n", "m", "f", 12, 8],
          ["g", "p", "o", "h", 12, 8],
        ],
      }),
    );
    expect(awards[0].id).toBe("flawless");
    expect(awards.length).toBeLessThanOrEqual(8);
    expect(awards.every((a) => a.winners.length > 0)).toBe(true);
  });
});
