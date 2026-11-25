import { describe, expect, test } from "vitest";
import { buildModel, closeMargin, isPointsScored } from "./model";
import { americano, doubleAmericano, eightPlayerRounds, fixedPairs } from "./fixtures";

describe("award engine model", () => {
  test("closeMargin", () => {
    expect(closeMargin(20)).toBe(2);
    expect(closeMargin(6)).toBe(1);
    expect(closeMargin(undefined)).toBe(2);
  });

  test("isPointsScored", () => {
    expect(isPointsScored("shared_total", 20)).toBe(true);
    expect(isPointsScored("first_to", 6)).toBe(false);
    expect(isPointsScored("first_to", 24)).toBe(true);
    expect(isPointsScored(undefined, undefined)).toBe(true);
  });

  test("results per appearance", () => {
    const m = buildModel(
      americano([
        [
          ["a", "b", "c", "d", 12, 8],
          ["e", "f", "g", "h", 10, 10],
        ],
      ]),
    );
    expect(m.competitors.get("a")!.appearances[0].result).toBe("win");
    expect(m.competitors.get("c")!.appearances[0].result).toBe("loss");
    for (const id of ["e", "f", "g", "h"])
      expect(m.competitors.get(id)!.appearances[0].result).toBe("draw");
    expect(m.competitors.get("a")!.appearances[0].partnerIds).toEqual(["b"]);
  });

  test("round index follows each player's own sequence across waves", () => {
    const g1 = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const g2 = ["i", "j", "k", "l", "m", "n", "o", "p"];
    const r1 = eightPlayerRounds(g1, () => [12, 8]);
    const r2 = eightPlayerRounds(g2, () => [11, 9]);
    const group = r1.map((games, r) => [...games, ...r2[r]]);
    const m = buildModel(
      doubleAmericano({
        groups: { 1: g1, 2: g2 },
        group,
        finals: [
          ["a", "i", "b", "j", 12, 8],
          ["c", "k", "d", "l", 12, 8],
          ["e", "m", "f", "n", 12, 8],
          ["g", "o", "h", "p", 12, 8],
        ],
        waves: true,
      }),
    );
    for (const id of [...g1, ...g2]) {
      const group = m.competitors.get(id)!.appearances.filter((a) => a.match.stage === "group");
      expect(group.map((a) => a.roundIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
    // The waves really were split: roundNumbers run up to 14.
    expect(Math.max(...m.input.matches.map((x) => x.roundNumber))).toBe(15);
    const final = m.competitors.get("a")!.appearances.find((a) => a.match.stage === "final")!;
    expect(final.roundIndex).toBe(1);
  });

  test("fixed pairs are one competitor", () => {
    const m = buildModel(
      fixedPairs("round_robin", [[["a", "b", "c", "d", 24, 20]], [["a", "b", "e", "f", 24, 10]]]),
    );
    expect([...m.competitors.keys()].sort()).toEqual(["a|b", "c|d", "e|f"]);
    expect(m.nameOf(["a", "b"])).toBe("A / B");
    expect(m.competitors.get("a|b")!.appearances).toHaveLength(2);
    expect(m.competitorKeysOf(["b", "a"])).toEqual(["a|b"]);
  });
});
