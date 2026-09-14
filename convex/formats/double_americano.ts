import { generateAmericanoRounds } from './americano'

export type GeneratedMatch = {
  courtNumber: number
  pairA: string[]
  pairB: string[]
}

type Player = { id: string; rating?: number }
type SplitMode = 'random' | 'top_bottom' | 'balanced'

function shuffled<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function validatePlayers(players: Player[], requireRatings: boolean) {
  if (players.length !== 16 || new Set(players.map(player => player.id)).size !== 16) {
    throw new Error('Double Americano requires exactly 16 unique players')
  }
  if (requireRatings && players.some(player =>
    player.rating === undefined
    || !Number.isFinite(player.rating)
    || player.rating < 1
    || player.rating > 7
  )) {
    throw new Error('Double Americano ratings must be finite numbers between 1 and 7')
  }
}

function validateGroups(group1: string[], group2: string[]) {
  if (
    group1.length !== 8
    || group2.length !== 8
    || new Set(group1).size !== 8
    || new Set(group2).size !== 8
    || group1.some(id => group2.includes(id))
  ) {
    throw new Error('Double Americano requires two distinct groups of eight players')
  }
}

export function splitDoubleAmericanoGroups(
  players: Player[],
  mode: SplitMode,
  random: () => number = Math.random,
): [string[], string[]] {
  validatePlayers(players, mode !== 'random')
  const mixed = shuffled(players, random)

  if (mode === 'random') {
    return [mixed.slice(0, 8).map(player => player.id), mixed.slice(8).map(player => player.id)]
  }

  if (mode === 'top_bottom') {
    const ranked = mixed.sort((a, b) => b.rating! - a.rating!)
    return [ranked.slice(0, 8).map(player => player.id), ranked.slice(8).map(player => player.id)]
  }

  const total = mixed.reduce((sum, player) => sum + player.rating!, 0)
  let bestDifference = Number.POSITIVE_INFINITY
  let bestIndexes: number[] = []

  function search(start: number, indexes: number[], sum: number) {
    if (indexes.length === 8) {
      const difference = Math.abs(total - 2 * sum)
      if (difference < bestDifference) {
        bestDifference = difference
        bestIndexes = [...indexes]
      }
      return
    }

    const needed = 8 - indexes.length
    for (let index = start; index <= mixed.length - needed; index++) {
      indexes.push(index)
      search(index + 1, indexes, sum + mixed[index].rating!)
      indexes.pop()
    }
  }

  search(0, [], 0)
  const selected = new Set(bestIndexes)
  return [
    mixed.filter((_, index) => selected.has(index)).map(player => player.id),
    mixed.filter((_, index) => !selected.has(index)).map(player => player.id),
  ]
}

export function generateDoubleAmericanoRounds(
  group1: string[],
  group2: string[],
  courtCount: number,
): GeneratedMatch[][] {
  validateGroups(group1, group2)
  if (!Number.isInteger(courtCount) || courtCount < 2) {
    throw new Error('Double Americano requires at least 2 courts')
  }

  const courtsPerGroup = Math.min(2, Math.floor(courtCount / 2))
  const firstRounds = generateAmericanoRounds(group1, courtsPerGroup)
  const secondRounds = generateAmericanoRounds(group2, courtsPerGroup)

  return firstRounds.map((round, index) => [
    ...round,
    ...secondRounds[index].map(match => ({
      ...match,
      courtNumber: match.courtNumber + courtsPerGroup,
    })),
  ])
}

export function generateDoubleAmericanoFinals(
  group1: string[],
  group2: string[],
  courtCount: number,
): (GeneratedMatch & { finalMatchIndex: number })[][] {
  validateGroups(group1, group2)
  if (!Number.isInteger(courtCount) || courtCount < 1) {
    throw new Error('Double Americano finals require at least 1 court')
  }

  const rounds: (GeneratedMatch & { finalMatchIndex: number })[][] = []
  for (let finalMatchIndex = 0; finalMatchIndex < 4; finalMatchIndex++) {
    const roundIndex = Math.floor(finalMatchIndex / courtCount)
    const seedIndex = finalMatchIndex * 2
    const match = {
      pairA: [group1[seedIndex], group2[seedIndex + 1]],
      pairB: [group2[seedIndex], group1[seedIndex + 1]],
      courtNumber: finalMatchIndex % courtCount + 1,
      finalMatchIndex,
    }
    ;(rounds[roundIndex] ??= []).push(match)
  }
  return rounds
}
