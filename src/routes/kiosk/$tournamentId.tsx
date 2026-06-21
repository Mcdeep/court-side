import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useEffect, useState } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { JoinQR } from '#/components/ui'

export const Route = createFileRoute('/kiosk/$tournamentId')({
  component: KioskPage,
})

// Rotate between courts and leaderboard on small screens; show both on wide.
const ROTATE_MS = 12_000

function KioskPage() {
  const { tournamentId } = useParams({ from: '/kiosk/$tournamentId' })
  const [tab, setTab] = useState<'courts' | 'board'>('courts')
  const [wide, setWide] = useState(false)

  const tournament = useQuery(api.tournaments.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const rounds = useQuery(api.rounds.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const leaderboard = useQuery(api.leaderboard.get, { tournamentId: tournamentId as Id<'tournaments'> })

  const activeRound = rounds?.find(r => r.state === 'in_progress') ?? rounds?.[rounds.length - 1]
  const matches = useQuery(api.matches.listByRound, activeRound ? { roundId: activeRound._id } : 'skip')

  // Measure width
  useEffect(() => {
    const check = () => setWide(window.innerWidth >= 1100)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-rotate on narrow screens
  useEffect(() => {
    if (wide) return
    const t = setInterval(() => setTab(p => p === 'courts' ? 'board' : 'courts'), ROTATE_MS)
    return () => clearInterval(t)
  }, [wide])

  if (tournament === undefined || rounds === undefined || leaderboard === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white/40 text-xl">
        Tournament not found.
      </div>
    )
  }

  const roundLabel = activeRound
    ? `Round ${activeRound.roundNumber}`
    : 'No rounds yet'
  const roundState = activeRound?.state

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/8 shrink-0">
        <span className="text-white/30 text-[13px] font-mono tracking-widest uppercase">CourtOS</span>
        <h1 className="font-display font-bold text-[22px] tracking-tight">{tournament.name}</h1>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-[14px] font-medium">{roundLabel}</span>
          {roundState === 'in_progress' && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {roundState === 'completed' && (
            <span className="text-[12px] font-semibold text-white/30">Completed</span>
          )}
        </div>
      </header>

      {/* Tab strip — narrow only */}
      {!wide && (
        <div className="flex border-b border-white/8 shrink-0">
          {(['courts', 'board'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[13px] font-semibold uppercase tracking-wider transition-colors
                ${tab === t ? 'text-white border-b-2 border-accent' : 'text-white/30 hover:text-white/60'}`}>
              {t === 'courts' ? 'Courts' : 'Standings'}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 flex min-h-0 ${wide ? 'flex-row' : 'flex-col'}`}>
        {/* Courts panel */}
        {(wide || tab === 'courts') && (
          <div className={`${wide ? 'w-[58%] border-r border-white/8' : 'flex-1'} p-6 overflow-auto`}>
            <SectionLabel>Courts</SectionLabel>
            {!matches || matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-4">
                {(tournament.state === 'draft' || tournament.state === 'registration_open') && (
                  <JoinQR tournamentId={tournamentId} size={160} tone="dark" />
                )}
                <span className="text-white/30 text-lg">No matches yet</span>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 mt-4">
                {[...matches].sort((a, b) => a.courtNumber - b.courtNumber).map(m => (
                  <CourtCard key={m._id} match={m} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard panel */}
        {(wide || tab === 'board') && (
          <div className={`${wide ? 'flex-1' : 'flex-1'} p-6 overflow-auto`}>
            <SectionLabel>Standings</SectionLabel>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-white/30 text-lg">No scores yet</div>
            ) : (
              <div className="mt-4 space-y-2">
                {leaderboard.slice(0, 16).map((entry, i) => (
                  <LeaderRow key={entry._id} entry={entry} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-widest text-white/30">{children}</div>
  )
}

function CourtCard({ match }: { match: any }) {
  const nameA1 = playerName(match.pairA?.participantA)
  const nameA2 = playerName(match.pairA?.participantB)
  const nameB1 = playerName(match.pairB?.participantA)
  const nameB2 = playerName(match.pairB?.participantB)
  const hasScore = match.scoreA !== undefined && match.scoreB !== undefined
  const isLive = match.state === 'in_progress'

  return (
    <div className={`rounded-2xl p-5 ring-1 ${isLive ? 'bg-white/6 ring-white/12' : 'bg-white/3 ring-white/6'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
          Court {match.courtNumber}
        </span>
        {isLive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </div>

      {/* Pair A */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate">{nameA1}</div>
          <div className="text-[13px] text-white/50 truncate">{nameA2}</div>
        </div>
        <div className="text-[32px] font-display font-bold tnum text-white shrink-0">
          {hasScore ? match.scoreA : '—'}
        </div>
      </div>

      <div className="border-t border-white/8 my-3" />

      {/* Pair B */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate">{nameB1}</div>
          <div className="text-[13px] text-white/50 truncate">{nameB2}</div>
        </div>
        <div className="text-[32px] font-display font-bold tnum text-white shrink-0">
          {hasScore ? match.scoreB : '—'}
        </div>
      </div>
    </div>
  )
}

function LeaderRow({ entry, rank }: { entry: any; rank: number }) {
  const isPodium = rank <= 3
  const rankColors = ['text-yellow-400', 'text-zinc-400', 'text-amber-600']

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl
      ${isPodium ? 'bg-white/5 ring-1 ring-white/8' : ''}`}>
      <span className={`w-7 text-center font-display font-bold text-[18px] shrink-0
        ${isPodium ? rankColors[rank - 1] : 'text-white/25'}`}>
        {rank}
      </span>
      <span className="flex-1 font-semibold text-[16px] truncate">{entry.displayName}</span>
      <div className="flex items-center gap-5 shrink-0 text-right">
        <div className="text-[13px] text-white/40">
          <span className="text-emerald-400">{entry.wins}W</span>
          <span className="mx-1 text-white/20">/</span>
          <span className="text-red-400">{entry.losses}L</span>
        </div>
        <div className="font-display font-bold text-[22px] tnum w-14 text-right">{entry.points}</div>
      </div>
    </div>
  )
}

function playerName(p: any) {
  return p?.user?.name ?? p?.walkInName ?? '?'
}
