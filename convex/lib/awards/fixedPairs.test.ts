import { describe, expect, test } from "vitest";
import { buildModel } from "./model";
import { fixedPairs, type Game } from "./fixtures";
import { biggestClimb, dreamTeam, longestReign, roadToGlory, summit } from "./fixedPairs";
import { demolitionJob, invincible } from "./general";

// Each round lists games court 1 first.
const model = (format: Parameters<typeof fixedPairs>[0], rounds: Game[][]) =>
  buildModel(fixedPairs(format, rounds));

describe("fixed-pair format awards", () => {
  test("longest reign: consecutive wins on court 1", () => {
    const m = model("king_of_the_court", [
      [
        ["a", "b", "c", "d", 24, 20],
        ["e", "f", "g", "h", 24, 20],
      ],
      [
        ["a", "b", "e", "f", 24, 18],
        ["c", "d", "g", "h", 24, 20],
      ],
      [
        ["a", "b", "c", "d", 24, 22],
        ["e", "f", "g", "h", 24, 20],
      ],
      [
        ["c", "d", "a", "b", 24, 10],
        ["e", "f", "g", "h", 24, 20],
      ],
    ]);
    const award = longestReign(m);
    expect(award?.winners).toEqual(["A / B"]);
    expect(award?.detail).toBe("Held court 1 for 3 rounds");
  });

  test("longest reign needs two rounds in a row", () => {
    const m = model("king_of_the_court", [
      [["a", "b", "c", "d", 24, 20]],
      [["c", "d", "a", "b", 24, 20]],
      [["a", "b", "c", "d", 24, 20]],
    ]);
    expect(longestReign(m)).toBeNull();
  });

  const ladder: Game[][] = [
    [
      ["a", "b", "c", "d", 24, 20],
      ["e", "f", "g", "h", 24, 20],
      ["i", "j", "k", "l", 24, 20],
    ],
    [
      ["a", "b", "e", "f", 24, 20],
      ["c", "d", "i", "j", 24, 20],
      ["g", "h", "k", "l", 24, 20],
    ],
    [
      ["a", "b", "i", "j", 24, 20],
      ["e", "f", "c", "d", 24, 20],
      ["k", "l", "g", "h", 24, 20],
    ],
  ];

  test("summit: most rounds on the top court", () => {
    const award = summit(model("snakes_and_ladders", ladder));
    expect(award?.winners).toEqual(["A / B"]);
    expect(award?.detail).toBe("3 rounds on the top court");
    expect(summit(model("snakes_and_ladders", ladder.slice(0, 2)))).toBeNull();
  });

  test("biggest climb: largest rise in court level", () => {
    const award = biggestClimb(model("snakes_and_ladders", ladder));
    // i/j: court 3 → court 1.
    expect(award?.winners).toEqual(["I / J"]);
    expect(award?.detail).toBe("Climbed from court 3 to court 1");
    expect(biggestClimb(model("snakes_and_ladders", ladder.slice(0, 1)))).toBeNull();
  });

  test("dream team: biggest total margin", () => {
    const award = dreamTeam(
      model("round_robin", [
        [
          ["a", "b", "c", "d", 24, 10],
          ["e", "f", "g", "h", 24, 20],
        ],
        [
          ["a", "b", "e", "f", 24, 20],
          ["c", "d", "g", "h", 24, 22],
        ],
      ]),
    );
    expect(award?.winners).toEqual(["A / B"]);
    expect(award?.detail).toBe("+18 across 2 matches");
  });

  test("road to glory: the champion's total winning margin", () => {
    const award = roadToGlory(
      model("knockout", [
        [
          ["a", "b", "c", "d", 24, 10],
          ["e", "f", "g", "h", 24, 20],
        ],
        [["a", "b", "e", "f", 24, 21]],
      ]),
    );
    expect(award?.winners).toEqual(["A / B"]);
    expect(award?.detail).toBe("Won 2 matches by 17 points in total");
  });
});

describe("review fixes: fixed-pair formats", () => {
  test("round labels use the real round when a pair sits out", () => {
    // 3 pairs, 1 court: e/f sit out round 1, a/b sit out round 2 ... round 4's 20–2 is Round 4.
    const m = model("king_of_the_court", [
      [["a", "b", "c", "d", 24, 20]],
      [["c", "d", "e", "f", 24, 20]],
      [["e", "f", "a", "b", 24, 20]],
      [["a", "b", "c", "d", 20, 2]],
    ]);
    expect(demolitionJob(m)?.detail).toBe("20–2 · Round 4");
  });

  test("road to glory needs a single final match", () => {
    // Tournament completed after the semis: last round still has two matches.
    const m = model("knockout", [
      [
        ["a", "b", "c", "d", 24, 10],
        ["e", "f", "g", "h", 24, 20],
      ],
    ]);
    expect(roadToGlory(m)).toBeNull();
  });

  test("invincible doesn't overstate matches for co-winners", () => {
    const m = model("king_of_the_court", [
      [["a", "b", "c", "d", 24, 20]],
      [["a", "b", "e", "f", 24, 20]],
      [["a", "b", "c", "d", 24, 20]],
      [["a", "b", "e", "f", 24, 20]],
      [["g", "h", "c", "d", 24, 20]],
      [["g", "h", "e", "f", 24, 20]],
      [["g", "h", "c", "d", 24, 20]],
    ]);
    const award = invincible(m);
    expect(award?.winners).toEqual(["A / B", "G / H"]);
    expect(award?.detail).toBe("Unbeaten all tournament");
  });
});
