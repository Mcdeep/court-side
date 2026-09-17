import { describe, expect, test } from "vitest";
import { countRoundRobinRounds, generateRoundRobinRounds } from "./round_robin";

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

describe("generateRoundRobinRounds", () => {
  test("every team plays every other team exactly once", () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`);
    const rounds = generateRoundRobinRounds(participants, 4);
    const teams: [string, string][] = [];
    for (let i = 0; i < participants.length; i += 2)
      teams.push([participants[i], participants[i + 1]]);
    const teamKey = (pair: [string, string]) =>
      teams.findIndex((t) => t[0] === pair[0] && t[1] === pair[1]);

    const matchupCounts = new Map<string, number>();
    for (const round of rounds) {
      for (const match of round) {
        const a = teamKey(match.pairA);
        const b = teamKey(match.pairB);
        const key = [a, b].sort().join(":");
        matchupCounts.set(key, (matchupCounts.get(key) ?? 0) + 1);
      }
    }

    const P = teams.length;
    expect(matchupCounts.size).toBe((P * (P - 1)) / 2);
    for (const count of matchupCounts.values()) expect(count).toBe(1);
  });

  test("never assigns the same court twice within one physical round", () => {
    const participants = Array.from({ length: 20 }, (_, index) => `player-${index + 1}`); // 10 teams
    const courtCount = 2;
    const rounds = generateRoundRobinRounds(participants, courtCount);

    for (const round of rounds) {
      expect(round.length).toBeLessThanOrEqual(courtCount);
      const courts = round.map((m) => m.courtNumber);
      expect(new Set(courts).size).toBe(courts.length);
    }
  });

  test("splits an oversubscribed leg into extra waves instead of doubling up courts", () => {
    // 8 teams (16 players) -> 4 matches/leg, but only 2 courts -> each leg needs 2 waves.
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`);
    const courtCount = 2;
    const rounds = generateRoundRobinRounds(participants, courtCount);

    // 8 teams (even) -> 7 legs, 4 matches/leg, 2 waves/leg -> 14 physical rounds.
    expect(rounds.length).toBe(14);
    expect(rounds.length).toBe(countRoundRobinRounds(8, courtCount));
  });

  test("does not park the circle-method anchor team on the same court every leg", () => {
    // Regression test: the anchor team (sched[0], never rotated by the
    // circle method) used to always land in the first matchup of every
    // leg, and therefore always court 1.
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`); // 8 teams
    const anchorPlayer = participants[0];
    const rounds = generateRoundRobinRounds(participants, 4, seededRandom(7));

    const anchorCourts = rounds
      .flatMap((round) =>
        round.filter((m) => m.pairA.includes(anchorPlayer) || m.pairB.includes(anchorPlayer)),
      )
      .map((m) => m.courtNumber);

    expect(anchorCourts.length).toBe(7); // plays once per leg, 7 legs for 8 teams
    expect(new Set(anchorCourts).size).toBeGreaterThan(1);
  });
});

describe("generateRoundRobinRounds seeded ordering", () => {
  function teamRanks(teamCount: number, participantsPerTeam = 2) {
    const ranks = new Map<string, number>();
    let player = 1;
    for (let team = 0; team < teamCount; team++) {
      for (let i = 0; i < participantsPerTeam; i++) {
        ranks.set(`player-${player}`, team + 1);
        player++;
      }
    }
    return ranks;
  }

  test("orders rounds from biggest rank-gap to closest match", () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`);
    const ranks = teamRanks(8);
    const rounds = generateRoundRobinRounds(participants, 4, Math.random, ranks);

    const gap = (roundIndex: number) =>
      Math.min(
        ...rounds[roundIndex].map((m) => Math.abs(ranks.get(m.pairA[0])! - ranks.get(m.pairB[0])!)),
      );

    const gaps = rounds.map((_, i) => gap(i));
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]);
    expect(gaps[gaps.length - 1]).toBe(1);
  });

  test("still plays every matchup exactly once when seeded", () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`);
    const ranks = teamRanks(8);
    const unseeded = generateRoundRobinRounds(participants, 4).flat();
    const seeded = generateRoundRobinRounds(participants, 4, Math.random, ranks).flat();

    const key = (m: { pairA: [string, string]; pairB: [string, string] }) =>
      [m.pairA.join(","), m.pairB.join(",")].sort().join("|");
    expect(new Set(seeded.map(key))).toEqual(new Set(unseeded.map(key)));
  });
});

describe("countRoundRobinRounds", () => {
  test("matches the actual generator output across a range of sizes and court counts", () => {
    for (const teamCount of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const courtCount of [1, 2, 3, 4]) {
        const participants = Array.from({ length: teamCount * 2 }, (_, i) => `p${i}`);
        const actual = generateRoundRobinRounds(participants, courtCount).length;
        expect(countRoundRobinRounds(teamCount, courtCount)).toBe(actual);
      }
    }
  });
});
