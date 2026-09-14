import { describe, expect, test } from 'vitest'
import {
  generateDoubleAmericanoFinals,
  generateDoubleAmericanoRounds,
  splitDoubleAmericanoGroups,
} from './double_americano'

const ids = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`)

function pairKey(a: string, b: string) {
  return [a, b].sort().join(':')
}

describe('splitDoubleAmericanoGroups', () => {
  test('random mode partitions all 16 unique players into equal groups', () => {
    const [group1, group2] = splitDoubleAmericanoGroups(
      ids.map(id => ({ id })),
      'random',
      () => 0,
    )

    expect(group1).toHaveLength(8)
    expect(group2).toHaveLength(8)
    expect(new Set([...group1, ...group2])).toEqual(new Set(ids))
  })

  test.each([
    [ids.slice(0, 15).map(id => ({ id }))],
    [[...ids.slice(0, 15).map(id => ({ id })), { id: ids[0] }]],
  ])('rejects player lists that are not exactly 16 unique players', players => {
    expect(() => splitDoubleAmericanoGroups(players, 'random')).toThrow()
  })

  test.each([
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    0.9,
    7.1,
  ])('rejects invalid rated-mode rating %s', rating => {
    const players = ids.map((id, index) => ({ id, rating: index === 0 ? rating : 4 }))
    expect(() => splitDoubleAmericanoGroups(players, 'balanced')).toThrow()
    expect(() => splitDoubleAmericanoGroups(players, 'top_bottom')).toThrow()
  })

  test('top-bottom mode places the eight highest-rated players in the first group', () => {
    const players = ids.map((id, index) => ({ id, rating: index + 1 <= 8 ? 2 : 6 }))
    const [group1, group2] = splitDoubleAmericanoGroups(players, 'top_bottom', () => 0.5)

    expect(new Set(group1)).toEqual(new Set(ids.slice(8)))
    expect(new Set(group2)).toEqual(new Set(ids.slice(0, 8)))
  })

  test('uses injected randomness to break equal-rating ordering', () => {
    const players = ids.map(id => ({ id, rating: 4 }))
    const first = splitDoubleAmericanoGroups(players, 'top_bottom', () => 0)
    const second = splitDoubleAmericanoGroups(players, 'top_bottom', () => 0.999)

    expect(first).not.toEqual(second)
  })

  test('finds the exact minimum balanced partition with fractional ratings', () => {
    const ratings = [
      6.9, 6.4, 6.1, 5.8, 5.2, 4.9, 4.3, 4.1,
      3.8, 3.6, 3.3, 2.9, 2.5, 2.2, 1.7, 1.1,
    ]
    const players = ids.map((id, index) => ({ id, rating: ratings[index] }))
    const [group1, group2] = splitDoubleAmericanoGroups(players, 'balanced', () => 0.5)
    const ratingById = new Map(players.map(player => [player.id, player.rating]))
    const difference = Math.abs(
      group1.reduce((sum, id) => sum + ratingById.get(id)!, 0)
      - group2.reduce((sum, id) => sum + ratingById.get(id)!, 0),
    )

    expect(difference).toBeCloseTo(0, 10)
  })
})

test('balanced splitting reaches the closest possible totals when equality is impossible', () => {
  const players = ids.map((id, index) => ({ id, rating: index === 15 ? 7 : 1 }))
  const [first, second] = splitDoubleAmericanoGroups(players, 'balanced')
  const sum = (group: string[]) => group.reduce((total, id) => total + players.find(player => player.id === id)!.rating, 0)
  expect(first).toHaveLength(8)
  expect(second).toHaveLength(8)
  // The group containing the rating-7 player totals 14; eight rating-1 players total 8.
  expect(Math.abs(sum(first) - sum(second))).toBe(6)
})

describe('generateDoubleAmericanoRounds', () => {
  test.each([
    { courts: 4, roundCount: 7, matchesPerRound: 4, usedCourts: [1, 2, 3, 4] },
    { courts: 2, roundCount: 14, matchesPerRound: 2, usedCourts: [1, 2] },
    { courts: 3, roundCount: 14, matchesPerRound: 2, usedCourts: [1, 2] },
  ])('assigns $courts courts across the expected waves', ({ courts, roundCount, matchesPerRound, usedCourts }) => {
    const rounds = generateDoubleAmericanoRounds(ids.slice(0, 8), ids.slice(8), courts)

    expect(rounds).toHaveLength(roundCount)
    expect(rounds.every(round => round.length === matchesPerRound)).toBe(true)
    expect(new Set(rounds.flat().map(match => match.courtNumber))).toEqual(new Set(usedCourts))
  })

  test.each([
    { courts: 4, wavesPerRound: 1, firstCourts: [1, 2], secondCourts: [3, 4] },
    { courts: 6, wavesPerRound: 1, firstCourts: [1, 2], secondCourts: [3, 4] },
    { courts: 2, wavesPerRound: 2, firstCourts: [1], secondCourts: [2] },
    { courts: 3, wavesPerRound: 2, firstCourts: [1], secondCourts: [2] },
  ])('swaps group courts after each complete partnership round with $courts courts', ({ courts, wavesPerRound, firstCourts, secondCourts }) => {
    const groups = [ids.slice(0, 8), ids.slice(8)]
    const rounds = generateDoubleAmericanoRounds(groups[0], groups[1], courts)
    for (let partnershipRound = 0; partnershipRound < 7; partnershipRound++) {
      const waves = rounds.slice(partnershipRound * wavesPerRound, (partnershipRound + 1) * wavesPerRound)
      const expectedCourts = partnershipRound % 2 === 0 ? [firstCourts, secondCourts] : [secondCourts, firstCourts]
      for (const wave of waves) {
        expect(wave.map(match => match.courtNumber)).toEqual([...firstCourts, ...secondCourts])
        for (const [groupIndex, group] of groups.entries()) {
          const groupMatches = wave.filter(match => group.includes(match.pairA[0]))
          expect(groupMatches.map(match => match.courtNumber)).toEqual(expectedCourts[groupIndex])
          expect(groupMatches.flatMap(match => [...match.pairA, ...match.pairB]).every(id => group.includes(id))).toBe(true)
        }
      }
      for (const group of groups) {
        const players = waves.flat().flatMap(match => [...match.pairA, ...match.pairB]).filter(id => group.includes(id))
        expect(players.sort()).toEqual([...group].sort())
      }
    }
  })

  test('preserves complete Americano partnership and opponent rotations within each group', () => {
    const groups = [ids.slice(0, 8), ids.slice(8)]
    const rounds = generateDoubleAmericanoRounds(groups[0], groups[1], 4)

    for (const group of groups) {
      const partnerships = new Map<string, number>()
      const opponents = new Map<string, number>()
      for (const match of rounds.flat().filter(match => group.includes(match.pairA[0]))) {
        for (const pair of [match.pairA, match.pairB]) {
          const key = pairKey(...pair as [string, string])
          partnerships.set(key, (partnerships.get(key) ?? 0) + 1)
        }
        for (const a of match.pairA) {
          for (const b of match.pairB) {
            const key = pairKey(a, b)
            opponents.set(key, (opponents.get(key) ?? 0) + 1)
          }
        }
      }
      expect(partnerships.size).toBe(28)
      expect([...partnerships.values()].every(count => count === 1)).toBe(true)
      expect(opponents.size).toBe(28)
      expect([...opponents.values()].every(count => count === 2)).toBe(true)
    }
  })

  test.each([1, 1.5, Number.NaN])('rejects invalid court count %s', courtCount => {
    expect(() => generateDoubleAmericanoRounds(ids.slice(0, 8), ids.slice(8), courtCount)).toThrow()
  })
})

describe('generateDoubleAmericanoFinals', () => {
  test.each([0, -1, 1.5, Number.NaN])('rejects invalid final court count %s', courtCount => {
    expect(() => generateDoubleAmericanoFinals(ids.slice(0, 8), ids.slice(8), courtCount)).toThrow()
  })
  test('creates the four crossover finals from ordered group seeds', () => {
    const finals = generateDoubleAmericanoFinals(ids.slice(0, 8), ids.slice(8), 3)

    expect(finals).toEqual([
      [
        { pairA: ['player-1', 'player-10'], pairB: ['player-9', 'player-2'], courtNumber: 1, finalMatchIndex: 0 },
        { pairA: ['player-3', 'player-12'], pairB: ['player-11', 'player-4'], courtNumber: 2, finalMatchIndex: 1 },
        { pairA: ['player-5', 'player-14'], pairB: ['player-13', 'player-6'], courtNumber: 3, finalMatchIndex: 2 },
      ],
      [{ pairA: ['player-7', 'player-16'], pairB: ['player-15', 'player-8'], courtNumber: 1, finalMatchIndex: 3 }],
    ])
  })

  test.each([
    [ids.slice(0, 7), ids.slice(8)],
    [[...ids.slice(0, 7), ids[0]], ids.slice(8)],
    [ids.slice(0, 8), [...ids.slice(8, 15), ids[0]]],
  ])('rejects malformed or overlapping groups', (group1, group2) => {
    expect(() => generateDoubleAmericanoFinals(group1, group2, 4)).toThrow()
    expect(() => generateDoubleAmericanoRounds(group1, group2, 4)).toThrow()
  })
})
