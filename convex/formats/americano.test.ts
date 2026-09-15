import { describe, expect, test } from "vitest";
import { generateAmericanoRounds } from "./americano";
import type { RoundPlan } from "./americano";

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function courtSpread(rounds: RoundPlan[], participants: string[], courts: number) {
  const counts = new Map(participants.map((id) => [id, Array<number>(courts).fill(0)]));
  for (const match of rounds.flat()) {
    for (const id of [...match.pairA, ...match.pairB]) {
      counts.get(id)![match.courtNumber - 1]++;
    }
  }
  return Math.max(...[...counts.values()].map((row) => Math.max(...row) - Math.min(...row)));
}

function fixtures(rounds: RoundPlan[]) {
  return rounds
    .flat()
    .map((match) =>
      [match.pairA, match.pairB]
        .map((pair) => [...pair].sort().join(":"))
        .sort()
        .join("|"),
    )
    .sort();
}

// Stress cases generate multiple schedules; attempt-count assertions bound work independently of host speed.
describe("generateAmericanoRounds", { timeout: 15_000 }, () => {
  test.each(
    [
      { players: 8, courts: 2, spread: 5 },
      { players: 12, courts: 3, spread: 2 },
      { players: 12, courts: 2, spread: 1 },
      { players: 16, courts: 4, spread: 3 },
      { players: 16, courts: 2, spread: 3 },
      { players: 16, courts: 3, spread: 0 },
      { players: 20, courts: 5, spread: 2 },
    ].flatMap((setup) => [0, 1, 7, 42].map((seed) => ({ ...setup, seed }))),
  )(
    "balances $players players over $courts courts within spread $spread (seed $seed)",
    ({ players, courts, spread, seed }) => {
      const participants = Array.from({ length: players }, (_, index) => `player-${index + 1}`);
      const rounds = generateAmericanoRounds(participants, courts, seededRandom(seed));
      expect(courtSpread(rounds, participants, courts)).toBeLessThanOrEqual(spread);
    },
  );

  test("still reaches spread one on a larger schedule within the reduced budget", () => {
    const participants = Array.from({ length: 20 }, (_, index) => `player-${index + 1}`);
    const rounds = generateAmericanoRounds(participants, 3, seededRandom(42));
    expect(courtSpread(rounds, participants, 3)).toBe(1);
  });

  test.each([
    [20, 5],
    [24, 4],
  ])("bounds court-search work for %i players and %i courts", (players, courtCount) => {
    const participants = Array.from({ length: players }, (_, index) => `player-${index + 1}`);
    const draws = [0, 0];
    for (const [index, courts] of [1, courtCount].entries()) {
      const random = seededRandom(42);
      generateAmericanoRounds(participants, courts, () => {
        draws[index]++;
        return random();
      });
    }
    // Fixture generation and match-side shuffles use the same number of draws.
    expect(draws[1] - draws[0]).toBeLessThanOrEqual(4 * 50_000);
  });

  test("stops a stalled court search even when every proposed swap is skipped", () => {
    const participants = Array.from({ length: 24 }, (_, index) => `player-${index + 1}`);
    let draws = 0;
    const random = seededRandom(42);
    const original = generateAmericanoRounds(participants, 1, () => {
      draws++;
      return random();
    });
    const matchCount = original.flat().length;
    const fixtureDraws = draws - matchCount;
    const replay = seededRandom(42);
    draws = 0;
    const balanced = generateAmericanoRounds(participants, 4, () => {
      draws++;
      return draws <= fixtureDraws ? replay() : 0;
    });

    expect(draws - fixtureDraws - matchCount).toBeLessThanOrEqual(3 * 10_000);
    expect(fixtures(balanced)).toEqual(fixtures(original));
    expect(courtSpread(balanced, participants, 4)).toBeLessThanOrEqual(3);
  });

  test.each(
    [
      [24, 4],
      [36, 4],
      [40, 6],
    ].flatMap(([players, courts]) => [0, 42].map((seed) => ({ players, courts, seed }))),
  )(
    "keeps larger schedules within spread two: $players players, $courts courts, seed $seed",
    ({ players, courts, seed }) => {
      const participants = Array.from({ length: players }, (_, index) => `player-${index + 1}`);
      const rounds = generateAmericanoRounds(participants, courts, seededRandom(seed));
      expect(courtSpread(rounds, participants, courts)).toBeLessThanOrEqual(2);
    },
  );

  test.each([
    [8, 2],
    [12, 3],
    [16, 4],
    [16, 2],
    [16, 3],
    [20, 5],
    [24, 4],
    [36, 4],
    [40, 6],
  ])(
    "preserves fixtures within each partnership round for %i players and %i courts",
    (players, courts) => {
      const participants = Array.from({ length: players }, (_, index) => `player-${index + 1}`);
      const original = generateAmericanoRounds(participants, 1, seededRandom(42));
      const balanced = generateAmericanoRounds(participants, courts, seededRandom(42));
      const matchesPerRound = players / 4;
      const wavesPerRound = Math.ceil(matchesPerRound / courts);

      expect(fixtures(balanced)).toEqual(fixtures(original));
      expect(balanced).toHaveLength((players - 1) * wavesPerRound);
      for (let index = 0; index < players - 1; index++) {
        expect(
          fixtures(balanced.slice(index * wavesPerRound, (index + 1) * wavesPerRound)),
        ).toEqual(fixtures(original.slice(index * matchesPerRound, (index + 1) * matchesPerRound)));
      }
      for (const wave of balanced) {
        const playing = wave.flatMap((match) => [...match.pairA, ...match.pairB]);
        expect(new Set(playing).size).toBe(playing.length);
        expect(new Set(wave.map((match) => match.courtNumber)).size).toBe(wave.length);
        expect(wave.length).toBeGreaterThan(0);
        expect(wave.length).toBeLessThanOrEqual(courts);
        for (const match of wave) {
          expect(Number.isInteger(match.courtNumber)).toBe(true);
          expect(match.courtNumber).toBeGreaterThanOrEqual(1);
          expect(match.courtNumber).toBeLessThanOrEqual(courts);
        }
      }
    },
  );

  test("repeats court assignments with the same injected random seed", () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`);
    expect(generateAmericanoRounds(participants, 3, seededRandom(42))).toEqual(
      generateAmericanoRounds(participants, 3, seededRandom(42)),
    );
  });

  test("proves the eight-player template cannot achieve court spread below five", () => {
    const participants = Array.from({ length: 8 }, (_, index) => `player-${index + 1}`);
    const rounds = generateAmericanoRounds(participants, 2, seededRandom(42));
    let minimumSpread = Infinity;
    for (let mask = 0; mask < 2 ** rounds.length; mask++) {
      const assignment = rounds.map((round, index) =>
        round.map((match) => ({
          ...match,
          courtNumber: (mask & (1 << index)) === 0 ? match.courtNumber : 3 - match.courtNumber,
        })),
      );
      minimumSpread = Math.min(minimumSpread, courtSpread(assignment, participants, 2));
    }
    expect(minimumSpread).toBe(5);
  });

  test("proves the twelve-player template cannot keep every court count between three and four", () => {
    const participants = Array.from({ length: 12 }, (_, index) => String(index));
    const rounds = generateAmericanoRounds(participants, 3, seededRandom(42)).map((round) =>
      round.map((match) => [...match.pairA, ...match.pairB].map(Number)),
    );
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    const counts = participants.map(() => [0, 0, 0]);

    function search(index: number): boolean {
      if (index === rounds.length) return true;
      for (const permutation of index === 0 ? [permutations[0]] : permutations) {
        const round = rounds[index];
        if (
          round.some((match, slot) =>
            match.some((player) => counts[player][permutation[slot]] === 4),
          )
        )
          continue;
        round.forEach((match, slot) =>
          match.forEach((player) => counts[player][permutation[slot]]++),
        );
        const remaining = rounds.length - index - 1;
        if (
          counts.every((row) => row.every((count) => count + remaining >= 3)) &&
          search(index + 1)
        )
          return true;
        round.forEach((match, slot) =>
          match.forEach((player) => counts[player][permutation[slot]]--),
        );
      }
      return false;
    }

    expect(search(0)).toBe(false);
  });

  test("preserves the sixteen-player group structure used to prove its court-spread bounds", () => {
    const participants = Array.from({ length: 16 }, (_, index) => String(index));
    const rounds = generateAmericanoRounds(participants, 4, seededRandom(42));
    const partitions = new Map<string, { groups: string[][]; repeats: number }>();
    for (const round of rounds) {
      const groups = round.map((match) => [...match.pairA, ...match.pairB].sort());
      const key = groups
        .map((group) => group.join(":"))
        .sort()
        .join("|");
      const partition = partitions.get(key);
      if (partition) partition.repeats++;
      else partitions.set(key, { groups, repeats: 1 });
    }
    const values = [...partitions.values()];
    expect(values).toHaveLength(5);
    expect(values.every((partition) => partition.repeats === 3)).toBe(true);
    for (let first = 0; first < values.length; first++) {
      for (let second = first + 1; second < values.length; second++) {
        for (const groupA of values[first].groups) {
          for (const groupB of values[second].groups) {
            expect(groupA.filter((player) => groupB.includes(player))).toHaveLength(1);
          }
        }
      }
    }
  });

  test("every participant partners every other participant exactly once", () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`);
    const rounds = generateAmericanoRounds(participants, 4, seededRandom(42));
    const partnershipCounts = new Map<string, number>();
    const opponentCounts = new Map<string, number>();

    for (const round of rounds) {
      const playing = new Set<string>();
      for (const match of round) {
        for (const pair of [match.pairA, match.pairB]) {
          expect(playing.has(pair[0])).toBe(false);
          expect(playing.has(pair[1])).toBe(false);
          playing.add(pair[0]);
          playing.add(pair[1]);

          const key = [...pair].sort().join(":");
          partnershipCounts.set(key, (partnershipCounts.get(key) ?? 0) + 1);
        }
        for (const a of match.pairA) {
          for (const b of match.pairB) {
            const key = [a, b].sort().join(":");
            opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
          }
        }
      }
      expect(playing.size).toBe(16);
    }

    expect(partnershipCounts.size).toBe((16 * 15) / 2);
    expect([...partnershipCounts.values()].every((count) => count === 1)).toBe(true);
    expect(opponentCounts.size).toBe((16 * 15) / 2);
    expect([...opponentCounts.values()].every((count) => count === 2)).toBe(true);
  });

  test("keeps every partnership when courts require multiple waves", () => {
    const participants = Array.from({ length: 8 }, (_, index) => `player-${index + 1}`);
    const rounds = generateAmericanoRounds(participants, 1, seededRandom(7));
    const partnerships = rounds.flatMap((round) =>
      round.flatMap((match) => [match.pairA, match.pairB]),
    );
    const uniquePartnerships = new Set(partnerships.map((pair) => [...pair].sort().join(":")));

    expect(partnerships).toHaveLength((8 * 7) / 2);
    expect(uniquePartnerships.size).toBe(partnerships.length);
  });

  test.each([4, 8, 12, 16])("balances every opponent pairing for %i players", (playerCount) => {
    const participants = Array.from({ length: playerCount }, (_, index) => `player-${index + 1}`);
    const rounds = generateAmericanoRounds(
      participants,
      playerCount / 4,
      seededRandom(playerCount),
    );
    const opponentCounts = new Map<string, number>();

    for (const match of rounds.flat()) {
      for (const a of match.pairA) {
        for (const b of match.pairB) {
          const key = [a, b].sort().join(":");
          opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
        }
      }
    }

    expect(opponentCounts.size).toBe((playerCount * (playerCount - 1)) / 2);
    expect([...opponentCounts.values()].every((count) => count === 2)).toBe(true);
  });
});
