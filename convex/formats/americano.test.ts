import { describe, expect, test } from 'vitest'
import { generateAmericanoRounds } from './americano'

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

describe('generateAmericanoRounds', () => {
  test('every participant partners every other participant exactly once', () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`)
    const rounds = generateAmericanoRounds(participants, 4, seededRandom(42))
    const partnershipCounts = new Map<string, number>()
    const opponentCounts = new Map<string, number>()

    for (const round of rounds) {
      const playing = new Set<string>()
      for (const match of round) {
        for (const pair of [match.pairA, match.pairB]) {
          expect(playing.has(pair[0])).toBe(false)
          expect(playing.has(pair[1])).toBe(false)
          playing.add(pair[0])
          playing.add(pair[1])

          const key = [...pair].sort().join(':')
          partnershipCounts.set(key, (partnershipCounts.get(key) ?? 0) + 1)
        }
        for (const a of match.pairA) {
          for (const b of match.pairB) {
            const key = [a, b].sort().join(':')
            opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1)
          }
        }
      }
      expect(playing.size).toBe(16)
    }

    expect(partnershipCounts.size).toBe((16 * 15) / 2)
    expect([...partnershipCounts.values()].every(count => count === 1)).toBe(true)
    expect(opponentCounts.size).toBe((16 * 15) / 2)
    expect([...opponentCounts.values()].every(count => count === 2)).toBe(true)
  })

  test('keeps every partnership when courts require multiple waves', () => {
    const participants = Array.from({ length: 8 }, (_, index) => `player-${index + 1}`)
    const rounds = generateAmericanoRounds(participants, 1, seededRandom(7))
    const partnerships = rounds.flatMap(round =>
      round.flatMap(match => [match.pairA, match.pairB]),
    )
    const uniquePartnerships = new Set(partnerships.map(pair => [...pair].sort().join(':')))

    expect(partnerships).toHaveLength((8 * 7) / 2)
    expect(uniquePartnerships.size).toBe(partnerships.length)
  })

  test.each([4, 8, 12, 16])('balances every opponent pairing for %i players', playerCount => {
    const participants = Array.from({ length: playerCount }, (_, index) => `player-${index + 1}`)
    const rounds = generateAmericanoRounds(participants, playerCount / 4, seededRandom(playerCount))
    const opponentCounts = new Map<string, number>()

    for (const match of rounds.flat()) {
      for (const a of match.pairA) {
        for (const b of match.pairB) {
          const key = [a, b].sort().join(':')
          opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1)
        }
      }
    }

    expect(opponentCounts.size).toBe((playerCount * (playerCount - 1)) / 2)
    expect([...opponentCounts.values()].every(count => count === 2)).toBe(true)
  })
})
