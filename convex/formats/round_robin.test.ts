import { describe, expect, test } from 'vitest'
import { countRoundRobinRounds, generateRoundRobinRounds } from './round_robin'

describe('generateRoundRobinRounds', () => {
  test('every team plays every other team exactly once', () => {
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`)
    const rounds = generateRoundRobinRounds(participants, 4)
    const teams: [string, string][] = []
    for (let i = 0; i < participants.length; i += 2) teams.push([participants[i], participants[i + 1]])
    const teamKey = (pair: [string, string]) => teams.findIndex(t => t[0] === pair[0] && t[1] === pair[1])

    const matchupCounts = new Map<string, number>()
    for (const round of rounds) {
      for (const match of round) {
        const a = teamKey(match.pairA)
        const b = teamKey(match.pairB)
        const key = [a, b].sort().join(':')
        matchupCounts.set(key, (matchupCounts.get(key) ?? 0) + 1)
      }
    }

    const P = teams.length
    expect(matchupCounts.size).toBe((P * (P - 1)) / 2)
    for (const count of matchupCounts.values()) expect(count).toBe(1)
  })

  test('never assigns the same court twice within one physical round', () => {
    const participants = Array.from({ length: 20 }, (_, index) => `player-${index + 1}`) // 10 teams
    const courtCount = 2
    const rounds = generateRoundRobinRounds(participants, courtCount)

    for (const round of rounds) {
      expect(round.length).toBeLessThanOrEqual(courtCount)
      const courts = round.map(m => m.courtNumber)
      expect(new Set(courts).size).toBe(courts.length)
    }
  })

  test('splits an oversubscribed leg into extra waves instead of doubling up courts', () => {
    // 8 teams (16 players) -> 4 matches/leg, but only 2 courts -> each leg needs 2 waves.
    const participants = Array.from({ length: 16 }, (_, index) => `player-${index + 1}`)
    const courtCount = 2
    const rounds = generateRoundRobinRounds(participants, courtCount)

    // 8 teams (even) -> 7 legs, 4 matches/leg, 2 waves/leg -> 14 physical rounds.
    expect(rounds.length).toBe(14)
    expect(rounds.length).toBe(countRoundRobinRounds(8, courtCount))
  })
})

describe('countRoundRobinRounds', () => {
  test('matches the actual generator output across a range of sizes and court counts', () => {
    for (const teamCount of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const courtCount of [1, 2, 3, 4]) {
        const participants = Array.from({ length: teamCount * 2 }, (_, i) => `p${i}`)
        const actual = generateRoundRobinRounds(participants, courtCount).length
        expect(countRoundRobinRounds(teamCount, courtCount)).toBe(actual)
      }
    }
  })
})
