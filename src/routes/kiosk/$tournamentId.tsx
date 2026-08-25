import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useEffect, useState } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { Icon } from '#/components/ui/icon'
import { useClock } from '#/features/kiosk/hooks'
import { CourtsPanel } from '#/features/kiosk/courts-panel'
import { BoardList } from '#/features/kiosk/leaderboard-list'
import { TickerMarquee } from '#/features/kiosk/ticker'
import { RoundTimer } from '#/features/kiosk/round-timer'
import { PodiumOverlay } from '#/features/kiosk/podium-overlay'
import { FinishedView } from '#/features/kiosk/finished-view'
import { computeKioskStats } from '#/features/kiosk/stats'

export const Route = createFileRoute('/kiosk/$tournamentId')({
  component: KioskPage,
})

const ROTATE_MS = 7_000

function KioskPage() {
  const { tournamentId } = useParams({ from: '/kiosk/$tournamentId' })
  const [tab, setTab] = useState<'courts' | 'board'>('courts')
  const [wide, setWide] = useState(false)
  const now = useClock()

  const tournament = useQuery(api.tournaments.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const rounds = useQuery(api.rounds.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const leaderboard = useQuery(api.leaderboard.get, { tournamentId: tournamentId as Id<'tournaments'> })

  const currentRound = rounds?.find(r => r.state === 'in_progress')
    ?? rounds?.find(r => r.state === 'pending')
    ?? rounds?.[rounds.length - 1]
  const nextRound = currentRound
    ? rounds?.find(r => r.state === 'pending' && r.roundNumber > currentRound.roundNumber)
    : undefined
  const matches = useQuery(api.matches.listByRound, currentRound ? { roundId: currentRound._id } : 'skip')
  const nextMatches = useQuery(api.matches.listByRound, nextRound ? { roundId: nextRound._id } : 'skip')

  const isCompleted = tournament?.state === 'completed'
  const history = useQuery(api.matches.historyByTournament, isCompleted ? { tournamentId: tournamentId as Id<'tournaments'> } : 'skip')

  const podiumKey = `kiosk-podium-seen-${tournamentId}`
  const [podiumDismissed, setPodiumDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(podiumKey) === '1'
  })

  useEffect(() => {
    const check = () => setWide(window.innerWidth >= 1100)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (wide) return
    const t = setInterval(() => setTab(p => p === 'courts' ? 'board' : 'courts'), ROTATE_MS)
    return () => clearInterval(t)
  }, [wide])

  if (tournament === undefined || rounds === undefined || leaderboard === undefined) {
    return (
      <div className="h-screen bg-ink flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="h-screen bg-ink flex items-center justify-center text-paper/40 text-xl">
        Tournament not found.
      </div>
    )
  }

  const sortedMatches = matches ? [...matches].sort((a, b) => a.courtNumber - b.courtNumber) : []
  const sortedNextMatches = nextMatches ? [...nextMatches].sort((a, b) => a.courtNumber - b.courtNumber) : []
  const totalRounds = rounds?.length ?? 0
  const roundState = currentRound?.state
  const isPreMatch = tournament.state === 'draft' || tournament.state === 'registration_open'
  const isLive = roundState === 'in_progress'

  return (
    <div className="h-screen bg-ink text-paper flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 h-24 border-b border-white/8 shrink-0 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="w-12 h-12 rounded-2xl bg-accent text-ink flex items-center justify-center font-display font-bold text-2xl shrink-0">
            C
          </span>
          <div className="min-w-0">
            <div className="font-display font-bold text-[26px] leading-none tracking-tight whitespace-nowrap">
              {tournament.name}
            </div>
            <div className="text-[14px] text-paper/45 font-medium mt-1 whitespace-nowrap">
              {isCompleted
                ? 'Tournament complete'
                : currentRound
                  ? `Round ${currentRound.roundNumber}${totalRounds > 1 ? ` of ${totalRounds}` : ''}`
                  : 'Setting up…'}
            </div>
          </div>
          {isLive && tournament.roundDurationMs && currentRound?.startedAt && (
            <RoundTimer durationMs={tournament.roundDurationMs} startedAt={currentRound.startedAt} />
          )}
        </div>
        <div className="flex items-center gap-5 shrink-0">
          {isLive && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 ring-1 ring-accent/30 text-accent px-4 h-10 text-[15px] font-bold uppercase tracking-wide whitespace-nowrap">
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-accent">
                <span className="absolute inset-0 rounded-full bg-accent animate-ping" />
              </span>
              Live now
            </span>
          )}
          <div className="font-mono tnum text-[26px] font-bold whitespace-nowrap shrink-0">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Tab strip — narrow only */}
      {!wide && !isCompleted && (
        <div className="flex border-b border-white/8 shrink-0">
          {(['courts', 'board'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[13px] font-semibold uppercase tracking-wider transition-colors
                ${tab === t ? 'text-paper border-b-2 border-accent' : 'text-paper/30 hover:text-paper/60'}`}
            >
              {t === 'courts' ? 'Courts' : 'Standings'}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {isCompleted ? (
        history === undefined ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
          </div>
        ) : (
          <FinishedView leaderboard={leaderboard} stats={computeKioskStats(history)} />
        )
      ) : wide ? (
        <main className="flex-1 grid grid-cols-[1fr_460px] gap-7 p-8 min-h-0">
          <CourtsPanel
            matches={sortedMatches}
            isPreMatch={isPreMatch}
            tournamentId={tournamentId}
          />
          <aside className="min-h-0">
            <section className="rounded-[28px] bg-white/[0.04] ring-1 ring-white/10 p-6 flex flex-col h-full min-h-0">
              <h2 className="font-display font-bold text-[19px] tracking-tight flex items-center gap-2 mb-2 shrink-0 whitespace-nowrap">
                <Icon name="trophy" className="w-5 h-5 text-accent shrink-0" />
                Leaderboard · Top 10
              </h2>
              {leaderboard.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-paper/30 text-lg">No scores yet</div>
              ) : (
                <BoardList rows={leaderboard.slice(0, 10)} />
              )}
            </section>
          </aside>
        </main>
      ) : (
        <div className="flex-1 min-h-0 p-6 overflow-hidden">
          {tab === 'courts' ? (
            <CourtsPanel
              matches={sortedMatches}
              isPreMatch={isPreMatch}
              tournamentId={tournamentId}
            />
          ) : (
            <div className="h-full flex flex-col">
              <h2 className="font-display font-bold text-[18px] tracking-tight flex items-center gap-2 mb-3 shrink-0">
                <Icon name="trophy" className="w-5 h-5 text-accent shrink-0" />
                Standings
              </h2>
              {leaderboard.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-paper/30 text-lg">No scores yet</div>
              ) : (
                <BoardList rows={leaderboard} />
              )}
            </div>
          )}
        </div>
      )}

      {!isCompleted && sortedNextMatches.length > 0 && <TickerMarquee matches={sortedNextMatches} />}

      {isCompleted && !podiumDismissed && leaderboard.length > 0 && (
        <PodiumOverlay
          tournamentName={tournament.name}
          top3={leaderboard.slice(0, 3)}
          onDismiss={() => {
            localStorage.setItem(podiumKey, '1')
            setPodiumDismissed(true)
          }}
        />
      )}
    </div>
  )
}
