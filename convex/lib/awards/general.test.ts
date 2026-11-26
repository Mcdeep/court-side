import { describe, expect, test } from "vitest";
import { buildModel } from "./model";
import { americano, doubleAmericano, eightPlayerRounds, type Game } from "./fixtures";
import { clutchPlayer, demolitionJob, invincible, onFire, unluckyOne, warrior } from "./general";

// Player "a" plays one match per round against rotating opponents; the
// result for "a"'s side is given per round.
function sequence(results: [number, number][], opts?: Parameters<typeof americano>[1]) {
  const rounds: Game[][] = results.map(([sa, sb], i) => [["a", `p${i}`, `x${i}`, `y${i}`, sa, sb]]);
  return buildModel(americano(rounds, opts));
}

describe("whole-event awards", () => {
  test("invincible after three or more unbeaten matches", () => {
    const award = invincible(
      sequence([
        [12, 8],
        [11, 9],
        [10, 10],
        [13, 7],
      ]),
    );
    expect(award?.winners).toEqual(["A"]);
    expect(award?.detail).toBe("Unbeaten in 4 matches");
    expect(
      invincible(
        sequence([
          [12, 8],
          [11, 9],
        ]),
      ),
    ).toBeNull();
  });

  test("on fire needs a streak of three; a draw resets it", () => {
    const award = onFire(
      sequence([
        [12, 8],
        [12, 8],
        [12, 8],
        [10, 10],
        [12, 8],
        [12, 8],
      ]),
    );
    expect(award?.winners).toEqual(["A"]);
    expect(award?.detail).toBe("3 wins in a row");
    expect(
      onFire(
        sequence([
          [12, 8],
          [12, 8],
          [8, 12],
          [12, 8],
        ]),
      ),
    ).toBeNull();
  });

  test("draws are neither wins nor losses", () => {
    const m = sequence([
      [10, 10],
      [10, 10],
      [11, 9],
      [10, 10],
    ]);
    expect(invincible(m)?.winners).toEqual(["A"]);
    expect(clutchPlayer(m)).toBeNull();
    expect(unluckyOne(m)).toBeNull();
  });

  test("clutch and unlucky use the close margin", () => {
    const m = sequence([
      [11, 9],
      [11, 9],
      [9, 11],
      [9, 11],
    ]);
    expect(clutchPlayer(m)?.winners).toContain("A");
    expect(clutchPlayer(m)?.detail).toBe("2 wins by 2 points or fewer");
    expect(unluckyOne(m)?.winners).toContain("A");
    // 6-game sets: close is 1, so 4–2 wins are not close.
    const sets = sequence(
      [
        [4, 2],
        [4, 2],
      ],
      { scoringMode: "first_to", pointsToWin: 6 },
    );
    expect(clutchPlayer(sets)).toBeNull();
  });

  test("demolition job picks the biggest margin and labels finals", () => {
    const m = sequence([
      [15, 5],
      [17, 3],
    ]);
    const award = demolitionJob(m);
    expect(award?.winners).toEqual(["A / P1"]);
    expect(award?.detail).toBe("17–3 · Round 2");

    const g1 = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const g2 = ["i", "j", "k", "l", "m", "n", "o", "p"];
    const r1 = eightPlayerRounds(g1, () => [11, 9]);
    const r2 = eightPlayerRounds(g2, () => [11, 9]);
    const double = buildModel(
      doubleAmericano({
        groups: { 1: g1, 2: g2 },
        group: r1.map((games, r) => [...games, ...r2[r]]),
        finals: [
          ["a", "j", "i", "b", 18, 2],
          ["c", "l", "k", "d", 12, 8],
          ["e", "n", "m", "f", 12, 8],
          ["g", "p", "o", "h", 12, 8],
        ],
      }),
    );
    expect(demolitionJob(double)?.detail).toBe("18–2 · Final 1");
  });

  test("warrior only for points-scored tournaments", () => {
    const m = sequence([
      [8, 12],
      [9, 11],
      [12, 8],
    ]);
    expect(warrior(m)?.detail).toContain("17 points in losing matches");
    const sets = sequence(
      [
        [4, 6],
        [3, 6],
      ],
      { scoringMode: "first_to", pointsToWin: 6 },
    );
    expect(warrior(sets)).toBeNull();
  });

  test("ties list up to two co-winners in order reached", () => {
    // a, b and c each win three in a row; a gets there first, then b, then c.
    const rounds: Game[][] = [
      [["a", "x1", "y1", "z1", 12, 8]],
      [["a", "x2", "y2", "z2", 12, 8]],
      [["a", "x3", "y3", "z3", 12, 8]],
      [["b", "x4", "y4", "z4", 12, 8]],
      [["b", "x5", "y5", "z5", 12, 8]],
      [["b", "x6", "y6", "z6", 12, 8]],
      [["c", "x7", "y7", "z7", 12, 8]],
      [["c", "x8", "y8", "z8", 12, 8]],
      [["c", "x9", "y9", "z9", 12, 8]],
    ];
    const award = onFire(buildModel(americano(rounds)));
    expect(award?.winners).toEqual(["A", "B"]);
    expect(award?.winnerIds).toEqual(["a", "b"]);
  });
});
