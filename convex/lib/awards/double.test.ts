import { describe, expect, test } from "vitest";
import { buildModel } from "./model";
import { americano, doubleAmericano, EIGHT, eightPlayerRounds, type Game } from "./fixtures";
import { dominator, finalsUpset, flawless, redemption } from "./double";

const G1 = EIGHT;
const G2 = ["i", "j", "k", "l", "m", "n", "o", "p"];

// Scores one group: `star` (optional) gets `starScore(round)` for their side,
// every other match is 10–10 unless `override(round, game)` returns a score.
function group(
  ids: string[],
  star?: string,
  starScore: (r: number) => [number, number] = () => [12, 8],
  override?: (r: number, g: Game) => [number, number] | undefined,
): Game[][] {
  return eightPlayerRounds(ids, () => [10, 10]).map((games, r) =>
    games.map((g) => {
      const [a1, a2, b1, b2] = g;
      const custom = override?.(r, g);
      if (custom) return [a1, a2, b1, b2, ...custom] as Game;
      if (!star || ![a1, a2, b1, b2].includes(star)) return g;
      const [forStar, against] = starScore(r);
      return (
        a1 === star || a2 === star
          ? [a1, a2, b1, b2, forStar, against]
          : [a1, a2, b1, b2, against, forStar]
      ) as Game;
    }),
  );
}

function build(g1: Game[][], g2: Game[][], finals: Game[]) {
  return buildModel(
    doubleAmericano({
      groups: { 1: G1, 2: G2 },
      group: g1.map((games, r) => [...games, ...g2[r]]),
      finals,
    }),
  );
}

const otherFinals: Game[] = [
  ["c", "l", "k", "d", 12, 8],
  ["e", "n", "m", "f", 12, 8],
  ["g", "p", "o", "h", 12, 8],
];

describe("double americano awards", () => {
  test("flawless: unbeaten group winner who wins Final 1", () => {
    // a wins every group game except a draw in round 4; i wins every game in group 2.
    const g1 = group(G1, "a", (r) => (r === 3 ? [10, 10] : [12, 8]));
    const g2 = group(G2, "i");
    const m = build(g1, g2, [["a", "j", "i", "b", 12, 8], ...otherFinals]);
    const award = flawless(m);
    // j also won Final 1 but lost group games to i; i lost the final.
    expect(award?.winners).toEqual(["A"]);
    expect(award?.detail).toBe("Unbeaten in Group 1 and won Final 1");
  });

  test("flawless: a group winner with a loss doesn't qualify", () => {
    const g1 = group(G1, "a", (r) => (r === 3 ? [8, 12] : [12, 8]));
    const g2 = group(G2, "i");
    expect(flawless(build(g1, g2, [["a", "j", "i", "b", 12, 8], ...otherFinals]))).toBeNull();
  });

  // Orient every final so the pair with more group points wins (no upset),
  // optionally flipping one final.
  function finalsFor(g1: Game[][], g2: Game[][], flip?: number): Game[] {
    const probe = build(g1, g2, [["a", "j", "i", "b", 12, 8], ...otherFinals]);
    const pts = (id: string) =>
      probe.competitors
        .get(id)!
        .appearances.filter((a) => a.match.stage === "group")
        .reduce((t, a) => t + a.scoreFor, 0);
    return [["a", "j", "i", "b"], ...otherFinals.map((f) => f.slice(0, 4))].map((f, i) => {
      const [a1, a2, b1, b2] = f as string[];
      const aStronger = pts(a1) + pts(a2) >= pts(b1) + pts(b2);
      const aWins = i === flip ? !aStronger : aStronger;
      return [a1, a2, b1, b2, aWins ? 12 : 8, aWins ? 8 : 12] as Game;
    });
  }

  test("finals upset: winners had fewer combined group points", () => {
    // a wins every game 13–7 (91 points, b 67); i wins every game 12–8 (84, j 68).
    // a + j (159) vs i + b (151): flipping Final 1 makes i + b win with 8 fewer.
    const g1 = group(G1, "a", () => [13, 7]);
    const g2 = group(G2, "i");
    const award = finalsUpset(build(g1, g2, finalsFor(g1, g2, 0)));
    expect(award?.winners).toEqual(["I / B"]);
    expect(award?.detail).toBe("Won Final 1 with 8 fewer group points");
    expect(finalsUpset(build(g1, g2, finalsFor(g1, g2)))).toBeNull();
  });

  test("redemption: lost the last group game, then won a final", () => {
    // Round 7 (index 6) game c+f vs d+e: c and f lose; everything else is a draw.
    const g1 = group(G1, undefined, undefined, (r, g) =>
      r === 6 && g[0] === "c" ? [8, 12] : undefined,
    );
    const g2 = group(G2);
    const award = redemption(
      build(g1, g2, [
        ["a", "j", "i", "b", 12, 8],
        ["c", "k", "d", "l", 12, 8],
        ["e", "m", "f", "n", 12, 8],
        ["g", "o", "h", "p", 12, 8],
      ]),
    );
    expect(award?.winners).toEqual(["C"]);
    expect(award?.detail).toBe("Lost their last group game, then won Final 2");
  });

  test("dominator: top group scorer who didn't win Final 1", () => {
    const g1 = group(G1);
    const g2 = group(G2, "i");
    const award = dominator(build(g1, g2, [["a", "j", "i", "b", 12, 8], ...otherFinals]));
    expect(award?.winners).toEqual(["I"]);
    expect(award?.detail).toBe("Top scorer: 84 group points");
    expect(dominator(build(g1, g2, [["a", "j", "i", "b", 8, 12], ...otherFinals]))).toBeNull();
  });

  test("none of these fire in a single americano", () => {
    const m = buildModel(americano(eightPlayerRounds(EIGHT, () => [12, 8])));
    for (const award of [flawless, finalsUpset, redemption, dominator]) expect(award(m)).toBeNull();
  });
});
