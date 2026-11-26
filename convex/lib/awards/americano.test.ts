import { describe, expect, test } from "vitest";
import { buildModel } from "./model";
import { americano, doubleAmericano, EIGHT, eightPlayerRounds, type Game } from "./fixtures";
import {
  comebackKing,
  consistent,
  giantSlayer,
  groupRounds,
  standingsAfter,
  strongFinisher,
} from "./americano";

// `ids[7]` loses badly for the first three rounds, then wins big; every other
// match is a 10–10 draw.
function comebackRounds(ids: string[], rounds = 7): Game[][] {
  const star = ids[7];
  return eightPlayerRounds(ids, () => [10, 10], rounds).map((games, r) =>
    games.map((g) => {
      const [a1, a2, b1, b2] = g;
      if (![a1, a2, b1, b2].includes(star)) return g;
      const starOnA = a1 === star || a2 === star;
      const [forStar, against] = r < 3 ? [4, 16] : [18, 2];
      return [a1, a2, b1, b2, starOnA ? forStar : against, starOnA ? against : forStar] as Game;
    }),
  );
}

describe("americano-family awards", () => {
  test("comeback king climbs from the halfway leaderboard", () => {
    const award = comebackKing(buildModel(americano(comebackRounds(EIGHT))));
    expect(award?.winners).toEqual(["H"]);
    expect(award?.detail).toMatch(/^Climbed from [5-8]th to 1st$/);
  });

  test("comeback king needs four rounds", () => {
    expect(comebackKing(buildModel(americano(comebackRounds(EIGHT, 3))))).toBeNull();
  });

  test("comeback king in a double americano names the group and ignores waves", () => {
    const g1 = EIGHT;
    const g2 = ["i", "j", "k", "l", "m", "n", "o", "p"];
    const r1 = eightPlayerRounds(g1, () => [10, 10]);
    const r2 = comebackRounds(g2);
    const spec = {
      groups: { 1: g1, 2: g2 },
      group: r1.map((games, r) => [...games, ...r2[r]]),
      finals: [
        ["a", "p", "i", "b", 12, 8],
        ["c", "j", "k", "d", 12, 8],
        ["e", "l", "m", "f", 12, 8],
        ["g", "n", "o", "h", 12, 8],
      ] as Game[],
    };
    const courts = comebackKing(buildModel(doubleAmericano(spec)));
    const waves = comebackKing(buildModel(doubleAmericano({ ...spec, waves: true })));
    expect(courts?.winners).toEqual(["P"]);
    expect(courts?.detail).toMatch(/ in Group 2$/);
    expect(waves).toEqual(courts);
  });

  // a+b beat c+d and e+f beat g+h for three rounds, so going into round 4
  // a and b share 1st, e and f 3rd, g and h 5th, c and d 7th.
  const setup: Game[][] = [0, 1, 2].map(() => [
    ["a", "b", "c", "d", 18, 2],
    ["e", "f", "g", "h", 12, 8],
  ]);

  test("giant slayer: lowest-ranked pair beats the leaders", () => {
    const award = giantSlayer(
      buildModel(
        americano([
          ...setup,
          [
            ["c", "d", "a", "b", 11, 9],
            ["e", "f", "g", "h", 12, 8],
          ],
        ]),
      ),
    );
    expect(award?.winners).toEqual(["C / D"]);
    expect(award?.detail).toBe("From 7th & 7th, beat A / B (1st & 1st) · Round 4");
  });

  test("giant slayer needs an upset", () => {
    expect(
      giantSlayer(
        buildModel(
          americano([
            ...setup,
            [
              ["a", "b", "c", "d", 11, 9],
              ["e", "f", "g", "h", 12, 8],
            ],
          ]),
        ),
      ),
    ).toBeNull();
  });

  // a and b each play every round on separate courts; their partners and
  // opponents only play once, so only a and b qualify for round-based awards.
  function twoPlayers(aScores: number[], bScores: number[]) {
    return buildModel(
      americano(
        aScores.map((sa, i) => [
          ["a", `p${i}`, `x${i}`, `y${i}`, sa, 20 - sa],
          ["b", `q${i}`, `z${i}`, `w${i}`, bScores[i], 20 - bScores[i]],
        ]),
      ),
    );
  }

  test("consistent picks the smallest spread over five or more rounds", () => {
    const award = consistent(twoPlayers([10, 10, 11, 10, 10], [6, 14, 10, 12, 8]));
    expect(award?.winners).toEqual(["A"]);
    expect(award?.detail).toBe("Scored 10–11 every round");
    expect(consistent(twoPlayers([10, 10, 11, 10], [6, 14, 10, 12]))).toBeNull();
  });

  test("strong finisher counts the last three group rounds", () => {
    const award = strongFinisher(twoPlayers([5, 5, 5, 15, 15, 15], [15, 15, 15, 5, 5, 5]));
    expect(award?.winners).toEqual(["A"]);
    expect(award?.detail).toBe("45 points in the last 3 rounds");
    expect(strongFinisher(twoPlayers([5, 5, 5, 15, 15], [15, 15, 15, 5, 5]))).toBeNull();
  });

  test("strong finisher ignores double americano finals", () => {
    const g2 = ["i", "j", "k", "l", "m", "n", "o", "p"];
    const r1 = eightPlayerRounds(EIGHT, () => [10, 10]);
    const r2 = eightPlayerRounds(g2, () => [10, 10]);
    const award = strongFinisher(
      buildModel(
        doubleAmericano({
          groups: { 1: EIGHT, 2: g2 },
          group: r1.map((games, r) => [...games, ...r2[r]]),
          finals: [
            ["a", "j", "i", "b", 20, 0],
            ["c", "l", "k", "d", 12, 8],
            ["e", "n", "m", "f", 12, 8],
            ["g", "p", "o", "h", 12, 8],
          ],
        }),
      ),
    );
    // Every group match was 10–10, so everyone ties on 30 — the 20-point
    // final for a/j doesn't count.
    expect(award?.detail).toBe("30 points in the last 3 rounds");
  });
});

describe("review fixes: rounds with sit-outs and units", () => {
  test("mexicano replay uses real rounds when players sit out", () => {
    // 5 players, 1 court: one sits out each round. Going into round 4, e has
    // played only twice, so their own match count (3rd match) must not be
    // mistaken for round 3.
    const rounds: Game[][] = [
      [["a", "b", "c", "d", 18, 2]],
      [["a", "c", "b", "e", 18, 2]],
      [["a", "d", "c", "e", 18, 2]],
      [["e", "b", "a", "c", 20, 0]],
    ];
    const m = buildModel({ ...americano(rounds), format: "mexicano", rankingOrder: ["points"] });
    const before4 = standingsAfter(m, 3);
    // After 3 real rounds e has 4 points (last). Leaking their round-4 20–0
    // win would give them 24 and lift them above d (20).
    expect(before4.get("a")).toBe(1);
    expect(before4.get("e")).toBe(5);
    expect(groupRounds(m)).toBe(4);
  });

  test("strong finisher says games for games-based scoring", () => {
    const m = buildModel(
      americano(
        [5, 5, 5, 6, 6, 6].map((s, i) => [["a", `p${i}`, `x${i}`, `y${i}`, s, 2] as Game]),
        { scoringMode: "first_to", pointsToWin: 6 },
      ),
    );
    expect(strongFinisher(m)?.detail).toBe("18 games in the last 3 rounds");
  });
});
