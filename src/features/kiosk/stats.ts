import type { FunctionReturnType } from 'convex/server'
import type { api } from '#/../convex/_generated/api'

type MatchHistory = FunctionReturnType<typeof api.matches.historyByTournament>

export interface StreakStat {
  name: string
  length: number
}

export interface BiggestWinStat {
  winners: string[]
  losers: string[]
  margin: number
  scoreA: number
  scoreB: number
  roundNumber: number
}

export interface PerfectRunStat {
  name: string
  games: number
}

export interface KioskStats {
  longestStreak: StreakStat | null
  biggestWin: BiggestWinStat | null
  perfectRuns: PerfectRunStat[]
}

export function computeKioskStats(history: MatchHistory): KioskStats {
  const byPlayer = new Map<string, { name: string; results: boolean[] }>()

  const sorted = [...history].sort((a, b) => a.roundNumber - b.roundNumber)

  for (const match of sorted) {
    const aWon = match.scoreA > match.scoreB
    for (const p of match.teamA) {
      const entry = byPlayer.get(p.participantId) ?? { name: p.name, results: [] }
      entry.results.push(aWon)
      byPlayer.set(p.participantId, entry)
    }
    for (const p of match.teamB) {
      const entry = byPlayer.get(p.participantId) ?? { name: p.name, results: [] }
      entry.results.push(!aWon)
      byPlayer.set(p.participantId, entry)
    }
  }

  let longestStreak: StreakStat | null = null
  const perfectRuns: PerfectRunStat[] = []

  for (const { name, results } of byPlayer.values()) {
    let current = 0
    let best = 0
    for (const won of results) {
      current = won ? current + 1 : 0
      if (current > best) best = current
    }
    if (best > 0 && (!longestStreak || best > longestStreak.length)) {
      longestStreak = { name, length: best }
    }
    const wins = results.filter(Boolean).length
    if (results.length >= 2 && wins === results.length) {
      perfectRuns.push({ name, games: results.length })
    }
  }
  perfectRuns.sort((a, b) => b.games - a.games)

  let biggestWin: BiggestWinStat | null = null
  for (const match of sorted) {
    const margin = Math.abs(match.scoreA - match.scoreB)
    if (!biggestWin || margin > biggestWin.margin) {
      const winners = match.scoreA > match.scoreB ? match.teamA : match.teamB
      const losers = match.scoreA > match.scoreB ? match.teamB : match.teamA
      biggestWin = {
        winners: winners.map(p => p.name),
        losers: losers.map(p => p.name),
        margin,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        roundNumber: match.roundNumber,
      }
    }
  }

  return { longestStreak, biggestWin, perfectRuns }
}
