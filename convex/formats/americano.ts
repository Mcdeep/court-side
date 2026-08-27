export type MatchPlan = {
  pairA: [string, string];
  pairB: [string, string];
  courtNumber: number;
};

export type RoundPlan = MatchPlan[];

type Partnership = [string, string];
type PartnershipMatch = [Partnership, Partnership];

const WHIST_SCHEDULES: Record<number, { labels: string; rounds: string[] }> = {
  4: {
    labels: "ABCD",
    rounds: ["AB CD", "AC BD", "AD BC"],
  },
  8: {
    labels: "ABCDEFGH",
    rounds: [
      "AB CD|EF GH", "AC EG|BD FH", "AD EH|BC FG", "AE BF|CG DH",
      "AF CH|BE DG", "AG DF|BH CE", "AH BG|CF DE",
    ],
  },
  12: {
    labels: "I0123456789T",
    rounds: [
      "I0 45|1T 28|37 69", "I1 56|20 39|48 7T", "I2 67|31 4T|59 80",
      "I3 78|42 50|6T 91", "I4 89|53 61|70 T2", "I5 9T|64 72|81 03",
      "I6 T0|75 83|92 14", "I7 01|86 94|T3 25", "I8 12|97 T5|04 36",
      "I9 23|T8 06|15 47", "IT 34|09 17|26 58",
    ],
  },
  16: {
    labels: "ABCDEFGHIJKLMNOP",
    rounds: [
      "AB CD|EF GH|IJ KL|MN OP", "EG FH|AC BD|MO NP|IK JL",
      "IL JK|MP NO|EH FG|AD BC", "AE IM|BF JN|CG KO|DH LP",
      "CH IN|BE LO|AF KP|DG JM", "BH KM|CE JP|DF IO|AG LN",
      "DE KN|AH JO|BG IP|CF LM", "BJ FN|AI EM|DL HP|CK GO",
      "AJ HO|DK EN|CL FM|BI GP", "BL EO|CI HN|DJ GM|AK FP",
      "CJ EP|BK HM|AL GN|DI FO", "CO GK|DP HL|BN FJ|AM EI",
      "DO FI|AN GL|CP EJ|BM HK", "BP GI|CM FL|AO HJ|DN EK",
      "AP FK|DM GJ|BO EL|CN HI",
    ],
  },
};

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function playerPairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function whistSchedule(ids: string[], random: () => number): PartnershipMatch[][] | null {
  const reference = WHIST_SCHEDULES[ids.length];
  if (!reference) return null;
  const playerByLabel = new Map([...reference.labels].map((label, index) => [label, ids[index]]));

  return shuffled(reference.rounds, random).map(round =>
    shuffled(round.split("|").map(game => {
      const [pairA, pairB] = game.split(" ");
      const players = (pair: string): Partnership => [
        playerByLabel.get(pair[0])!,
        playerByLabel.get(pair[1])!,
      ];
      return [players(pairA), players(pairB)] as PartnershipMatch;
    }), random),
  );
}

function opponentPenalty(count: number) {
  return (count - 2) ** 2 + (count === 0 ? 20 : 0) + (count > 3 ? 20 * (count - 3) : 0);
}

function opponentCost(
  pairA: Partnership,
  pairB: Partnership,
  opponentCounts: Map<string, number>,
) {
  let cost = 0;
  for (const a of pairA) {
    for (const b of pairB) {
      const count = opponentCounts.get(playerPairKey(a, b)) ?? 0;
      cost += opponentPenalty(count + 1) - opponentPenalty(count);
    }
  }
  return cost;
}

function pairPartnerships(
  partnerships: Partnership[],
  opponentCounts: Map<string, number>,
  random: () => number,
): PartnershipMatch[] {
  const mixed = shuffled(partnerships, random);

  if (mixed.length > 16) {
    const remaining = [...mixed];
    const matches: PartnershipMatch[] = [];
    while (remaining.length > 0) {
      const pairA = remaining.shift()!;
      let bestIndex = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      for (let i = 0; i < remaining.length; i++) {
        const cost = opponentCost(pairA, remaining[i], opponentCounts);
        if (cost < bestCost) {
          bestCost = cost;
          bestIndex = i;
        }
      }
      matches.push([pairA, remaining.splice(bestIndex, 1)[0]]);
    }
    return matches;
  }

  const fullMask = (1 << mixed.length) - 1;
  const memo = new Map<number, { cost: number; matches: [number, number][] }>();

  function solve(mask: number): { cost: number; matches: [number, number][] } {
    if (mask === 0) return { cost: 0, matches: [] };
    const cached = memo.get(mask);
    if (cached) return cached;

    let first = 0;
    while ((mask & (1 << first)) === 0) first++;
    const withoutFirst = mask & ~(1 << first);
    let best = { cost: Number.POSITIVE_INFINITY, matches: [] as [number, number][] };

    for (let other = first + 1; other < mixed.length; other++) {
      if ((withoutFirst & (1 << other)) === 0) continue;
      const rest = solve(withoutFirst & ~(1 << other));
      const cost = opponentCost(mixed[first], mixed[other], opponentCounts) + rest.cost;
      if (cost < best.cost) {
        best = { cost, matches: [[first, other], ...rest.matches] };
      }
    }

    memo.set(mask, best);
    return best;
  }

  return solve(fullMask).matches.map(([a, b]) => [mixed[a], mixed[b]]);
}

function addOpponents(match: PartnershipMatch, opponentCounts: Map<string, number>) {
  for (const a of match[0]) {
    for (const b of match[1]) {
      const key = playerPairKey(a, b);
      opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
    }
  }
}

function balanceScore(ids: string[], opponentCounts: Map<string, number>) {
  let score = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const difference = (opponentCounts.get(playerPairKey(ids[i], ids[j])) ?? 0) - 2;
      score += opponentPenalty(difference + 2);
    }
  }
  return score;
}

function opponentChanges(
  removed: PartnershipMatch[],
  added: PartnershipMatch[],
) {
  const changes = new Map<string, number>();
  const add = (match: PartnershipMatch, amount: number) => {
    for (const a of match[0]) {
      for (const b of match[1]) {
        const key = playerPairKey(a, b);
        changes.set(key, (changes.get(key) ?? 0) + amount);
      }
    }
  };
  for (const match of removed) add(match, -1);
  for (const match of added) add(match, 1);
  return changes;
}

function improveOpponentBalance(
  schedule: PartnershipMatch[][],
  ids: string[],
  random: () => number,
) {
  const opponentCounts = new Map<string, number>();
  for (const round of schedule) {
    for (const match of round) addOpponents(match, opponentCounts);
  }

  let score = balanceScore(ids, opponentCounts);
  let bestScore = score;
  let bestSchedule = schedule.map(round => [...round]);
  const iterations = ids.length <= 20 ? 100_000 : 200_000;

  for (let iteration = 0; iteration < iterations && bestScore > 0; iteration++) {
    const roundIndex = Math.floor(random() * schedule.length);
    const round = schedule[roundIndex];
    if (round.length < 2) continue;

    const moveSize = round.length >= 3 && random() < 0.6 ? 3 : 2;
    const matchIndexes = shuffled(
      Array.from({ length: round.length }, (_, index) => index),
      random,
    ).slice(0, moveSize);
    const removed = matchIndexes.map(index => round[index]);
    const partnerships = removed.flatMap(match => [match[0], match[1]]);
    const alternative = shuffled(matchupOptions(partnerships), random)[0];
    const changes = opponentChanges(removed, alternative);

    let delta = 0;
    for (const [key, change] of changes) {
      const count = opponentCounts.get(key) ?? 0;
      delta += opponentPenalty(count + change) - opponentPenalty(count);
    }

    const progress = iteration / iterations;
    const temperature = 2 * (1 - progress) + 0.05;
    if (delta > 0 && random() >= Math.exp(-delta / temperature)) continue;

    for (const [key, change] of changes) {
      opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + change);
    }
    for (let i = 0; i < matchIndexes.length; i++) {
      round[matchIndexes[i]] = alternative[i];
    }
    score += delta;

    if (score < bestScore) {
      bestScore = score;
      bestSchedule = schedule.map(item => [...item]);
    }
  }

  return bestSchedule;
}

function matchupOptions(partnerships: Partnership[]): PartnershipMatch[][] {
  if (partnerships.length === 0) return [[]];
  const [first, ...remaining] = partnerships;
  const options: PartnershipMatch[][] = [];
  for (let i = 0; i < remaining.length; i++) {
    const second = remaining[i];
    const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
    for (const matches of matchupOptions(rest)) {
      options.push([[first, second], ...matches]);
    }
  }
  return options;
}

function exactOpponentSchedule(
  partnershipRounds: Partnership[][],
  random: () => number,
): PartnershipMatch[][] | null {
  if (partnershipRounds[0].length > 6) return null;

  const optionsByRound = partnershipRounds.map(round => shuffled(matchupOptions(round), random));
  const opponentCounts = new Map<string, number>();
  const selected = new Map<number, PartnershipMatch[]>();
  let visited = 0;

  const isValid = (matches: PartnershipMatch[]) => matches.every(match =>
    match[0].every(a => match[1].every(b =>
      (opponentCounts.get(playerPairKey(a, b)) ?? 0) < 2,
    )),
  );

  function search(remainingRounds: number[]): boolean {
    if (remainingRounds.length === 0) return true;
    if (++visited > 2_000_000) return false;

    let chosenRound = remainingRounds[0];
    let validOptions = optionsByRound[chosenRound].filter(isValid);
    for (const roundIndex of remainingRounds.slice(1)) {
      const candidates = optionsByRound[roundIndex].filter(isValid);
      if (candidates.length < validOptions.length) {
        chosenRound = roundIndex;
        validOptions = candidates;
      }
      if (validOptions.length === 0) return false;
    }

    validOptions.sort((a, b) => {
      const cost = (matches: PartnershipMatch[]) => matches.reduce(
        (total, match) => total + opponentCost(match[0], match[1], opponentCounts),
        0,
      );
      return cost(a) - cost(b);
    });

    const nextRounds = remainingRounds.filter(index => index !== chosenRound);
    for (const matches of validOptions) {
      for (const match of matches) addOpponents(match, opponentCounts);
      selected.set(chosenRound, matches);
      if (search(nextRounds)) return true;
      selected.delete(chosenRound);
      for (const match of matches) {
        for (const a of match[0]) {
          for (const b of match[1]) {
            const key = playerPairKey(a, b);
            opponentCounts.set(key, (opponentCounts.get(key) ?? 0) - 1);
          }
        }
      }
    }
    return false;
  }

  const roundIndexes = partnershipRounds.map((_, index) => index);
  if (!search(shuffled(roundIndexes, random))) return null;
  return shuffled([...selected.values()], random);
}

export function generateAmericanoRounds(
  participantIds: string[],
  courtCount: number,
  random: () => number = Math.random,
): RoundPlan[] {
  const n = participantIds.length;
  if (n < 4) throw new Error("Americano requires at least 4 participants");

  const usable = Math.floor(n / 4) * 4;
  const ids = shuffled(participantIds.slice(0, usable), random);
  const matchesPerRound = usable / 4;
  const courts = Math.min(courtCount, matchesPerRound);
  if (courts < 1) throw new Error("Americano requires at least 1 court");

  const partnershipRounds: Partnership[][] = [];
  let rotation = [...ids];
  for (let round = 0; round < usable - 1; round++) {
    const partnerships: Partnership[] = [];
    for (let i = 0; i < usable / 2; i++) {
      partnerships.push([rotation[i], rotation[usable - 1 - i]]);
    }
    partnershipRounds.push(partnerships);
    rotation = [rotation[0], rotation[usable - 1], ...rotation.slice(1, usable - 1)];
  }

  const exactSchedule = whistSchedule(ids, random) ?? exactOpponentSchedule(partnershipRounds, random);
  const attempts = usable <= 20 ? 40 : usable <= 32 ? 12 : 60;
  let bestSchedule: PartnershipMatch[][] = exactSchedule ?? [];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; exactSchedule === null && attempt < attempts; attempt++) {
    const opponentCounts = new Map<string, number>();
    const schedule = shuffled(partnershipRounds, random).map(partnerships => {
      const matches = pairPartnerships(partnerships, opponentCounts, random);
      for (const match of matches) addOpponents(match, opponentCounts);
      return matches;
    });
    const score = balanceScore(ids, opponentCounts);
    if (score < bestScore) {
      bestScore = score;
      bestSchedule = schedule;
    }
    if (score === 0) break;
  }

  if (exactSchedule === null) {
    bestSchedule = improveOpponentBalance(bestSchedule, ids, random);
  }

  const rounds: RoundPlan[] = [];
  for (const partnershipMatches of bestSchedule) {
    for (let start = 0; start < partnershipMatches.length; start += courts) {
      const wave = partnershipMatches.slice(start, start + courts);
      rounds.push(wave.map((match, index) => {
        const sides = shuffled(match, random);
        return {
          pairA: sides[0],
          pairB: sides[1],
          courtNumber: index + 1,
        };
      }));
    }
  }

  return rounds;
}
