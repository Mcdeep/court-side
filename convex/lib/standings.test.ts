import { describe, expect, test } from "vitest";
import { rankStandings } from "./standings";

const row = (participantId: string, points = 20, wins = 1) => ({
  participantId,
  points,
  wins,
  losses: 1,
});
const match = (pairA: string[], pairB: string[], scoreA: number, scoreB: number) => ({
  pairA,
  pairB,
  scoreA,
  scoreB,
});
const placements = (rows: ReturnType<typeof rankStandings>) =>
  rows.map((r) => [r.participantId, r.rank, r.tied]);

describe("rankStandings", () => {
  test("keeps points first and breaks equal points by wins", () => {
    expect(
      placements(rankStandings([row("a", 20, 1), row("b", 20, 2), row("c", 21, 0)], [])),
    ).toEqual([
      ["c", 1, false],
      ["b", 2, false],
      ["a", 3, false],
    ]);
  });

  test("can rank matches won ahead of a higher points total", () => {
    expect(
      placements(
        rankStandings(
          [row("a", 30, 1), row("b", 20, 2), row("c", 19, 2)],
          [],
          ["wins", "points", "point_diff", "head_to_head"],
        ),
      ),
    ).toEqual([
      ["b", 1, false],
      ["c", 2, false],
      ["a", 3, false],
    ]);
  });

  test("can use points only after the preceding criteria remain tied", () => {
    const results = [match(["a", "x"], ["y", "z"], 10, 8), match(["b", "x"], ["y", "z"], 10, 2)];
    expect(
      placements(
        rankStandings([row("a", 30, 2), row("b", 20, 2)], results, [
          "wins",
          "point_diff",
          "head_to_head",
          "points",
        ]),
      ),
    ).toEqual([
      ["b", 1, false],
      ["a", 2, false],
    ]);
  });

  test("breaks equal wins by point difference", () => {
    const results = [match(["a", "x"], ["y", "z"], 20, 18), match(["b", "x"], ["y", "z"], 20, 12)];
    const ranked = rankStandings([row("a"), row("b")], results);
    expect(ranked.map((r) => [r.participantId, r.pointDiff, r.rank])).toEqual([
      ["b", 8, 1],
      ["a", 2, 2],
    ]);
  });

  test("uses the configured order instead of a fixed wins-first order", () => {
    const results = [match(["a", "x"], ["y", "z"], 20, 18), match(["b", "x"], ["y", "z"], 20, 12)];
    const ranked = rankStandings([row("a", 20, 2), row("b", 20, 1)], results, [
      "points",
      "point_diff",
      "wins",
      "head_to_head",
    ]);
    expect(placements(ranked)).toEqual([
      ["b", 1, false],
      ["a", 2, false],
    ]);
  });

  test("breaks a tie using only matches played as opponents", () => {
    const results = [
      match(["a", "x"], ["b", "y"], 10, 8),
      match(["a", "b"], ["x", "y"], 30, 0),
      match(["b", "x"], ["y", "z"], 10, 6),
    ];
    const ranked = rankStandings([row("b"), row("a")], results);
    expect(ranked.map((r) => r.pointDiff)).toEqual([32, 32]);
    expect(placements(ranked)).toEqual([
      ["a", 1, false],
      ["b", 2, false],
    ]);
  });

  test("uses a three-way mini-table without reapplying head-to-head to a remaining tie", () => {
    const results = [
      match(["a", "x"], ["b", "y"], 10, 8),
      match(["b", "x"], ["c", "y"], 11, 8),
      match(["c", "x"], ["a", "y"], 9, 8),
    ];
    const order = ["points", "head_to_head", "wins", "point_diff"] as const;
    expect(placements(rankStandings([row("c"), row("b"), row("a")], results, order))).toEqual([
      ["a", 1, true],
      ["b", 1, true],
      ["c", 3, false],
    ]);
  });

  test("head-to-head considers only players tied after earlier criteria", () => {
    const results = [match(["a", "x"], ["b", "y"], 10, 8), match(["c", "x"], ["a", "y"], 100, 0)];
    const ranked = rankStandings([row("a"), row("b"), row("c", 21)], results, [
      "points",
      "head_to_head",
      "wins",
      "point_diff",
    ]);
    expect(placements(ranked)).toEqual([
      ["c", 1, false],
      ["a", 2, false],
      ["b", 3, false],
    ]);
  });

  test("counts each tied opponent in the mini-table", () => {
    const results = [match(["a", "b"], ["c", "x"], 10, 8)];
    expect(
      placements(
        rankStandings([row("c"), row("b"), row("a")], results, [
          "points",
          "head_to_head",
          "wins",
          "point_diff",
        ]),
      ),
    ).toEqual([
      ["a", 1, true],
      ["b", 1, true],
      ["c", 3, false],
    ]);
  });

  test("shares unresolved positions and skips occupied ranks", () => {
    expect(placements(rankStandings([row("d", 10), row("c"), row("b"), row("a", 30)], []))).toEqual(
      [
        ["a", 1, false],
        ["b", 2, true],
        ["c", 2, true],
        ["d", 4, false],
      ],
    );
  });

  test("shares the title and produces stable ties without mutating its inputs", () => {
    const rows = [row("b"), row("a")];
    const original = structuredClone(rows);
    expect(placements(rankStandings(rows, []))).toEqual([
      ["a", 1, true],
      ["b", 1, true],
    ]);
    expect(rows).toEqual(original);
  });

  test("can preserve points-only rankings for other formats", () => {
    expect(
      placements(
        rankStandings([row("b", 20, 2), row("c", 10, 3), row("a", 20, 1)], [], ["points"]),
      ),
    ).toEqual([
      ["a", 1, true],
      ["b", 1, true],
      ["c", 3, false],
    ]);
  });

  test("counts draws as games played", () => {
    const ranked = rankStandings([row("a", 10, 0)], [match(["a", "b"], ["c", "d"], 10, 10)]);
    expect(ranked[0].played).toBe(1);
    expect(ranked[0].pointDiff).toBe(0);
  });

  test("handles an empty leaderboard", () => {
    expect(rankStandings([], [])).toEqual([]);
  });
});
