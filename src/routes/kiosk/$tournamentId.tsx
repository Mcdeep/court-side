import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { JoinQR } from '#/components/ui/join-qr'
import { participantName } from '#/lib/names'
import type { LeaderboardEntry, Match } from '#/features/tournaments/types'

export const Route = createFileRoute('/kiosk/$tournamentId')({
  component: KioskPage,
})

const ROTATE_MS = 7_000

/* ─── Hooks ─────────────────────────────────────────────────── */

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function useRotatingPages<T>(items: T[], perPage: number, intervalMs: number) {
  const pages = useMemo(() => {
    const p: T[][] = []
    for (let i = 0; i < items.length; i += perPage) p.push(items.slice(i, i + perPage))
    return p.length ? p : ([] as T[][])
  }, [items, perPage])
  const [page, setPage] = useState(0)
  useEffect(() => {
    if (pages.length <= 1) return
    const t = setInterval(() => setPage(p => (p + 1) % pages.length), intervalMs)
    return () => clearInterval(t)
  }, [pages.length, intervalMs])
  return [pages[page % pages.length] ?? [], page, pages.length] as const
}

/* ─── Helpers ───────────────────────────────────────────────── */

function kinitials(n: string) {
  if (!n) return '?'
  return n.split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function klast(n: string) {
  if (!n) return '—'
  return n.split(' ').slice(-1)[0] ?? n
}

/* ─── Tiny shared components ─────────────────────────────────── */

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold shrink-0 bg-white/10 text-paper ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {kinitials(name)}
    </span>
  )
}

function Marquee({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const track = el.firstElementChild as HTMLElement
    if (!track) return
    const check = () => {
      const overflow = track.scrollWidth - el.clientWidth
      if (overflow > 4) {
        el.classList.add('is-overflowing')
        el.style.setProperty('--marquee-shift', `-${overflow + 12}px`)
      } else {
        el.classList.remove('is-overflowing')
      }
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])
  return (
    <div ref={ref} className={`marquee-mask overflow-hidden ${className}`}>
      <span className="marquee-track inline-block whitespace-nowrap">{children}</span>
    </div>
  )
}

/* ─── Icons ─────────────────────────────────────────────────── */

function CourtIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 5h18v14H3zM12 5v14M3 9h4v6H3zM17 9h4v6h-4z" />
    </svg>
  )
}

function TrophyIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 14h6M10 14l-1 4h6l-1-4M8 22h8" />
    </svg>
  )
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />
    </svg>
  )
}

/* ─── Court card ─────────────────────────────────────────────── */

function CourtCard({ match }: { match: Match }) {
  const nameA1 = participantName(match.pairA?.participantA)
  const nameA2 = participantName(match.pairA?.participantB)
  const nameB1 = participantName(match.pairB?.participantA)
  const nameB2 = participantName(match.pairB?.participantB)
  const hasScore = match.scoreA !== undefined && match.scoreB !== undefined
  const isLive = match.state === 'in_progress'
  const aLead = hasScore && (match.scoreA ?? 0) > (match.scoreB ?? 0)
  const bLead = hasScore && (match.scoreB ?? 0) > (match.scoreA ?? 0)

  return (
    <div className="rounded-[28px] bg-white/[0.04] ring-1 ring-white/10 p-6 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-accent/10 pointer-events-none" />
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2.5">
          <span className="w-11 h-11 rounded-2xl bg-accent text-ink flex items-center justify-center font-display font-bold text-[20px] shrink-0">
            {match.courtNumber}
          </span>
          <span className="font-display font-bold text-[15px] uppercase tracking-wider text-paper/50 whitespace-nowrap">
            Court {match.courtNumber}
          </span>
        </div>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-accent">
            <span className="relative inline-flex w-2 h-2 rounded-full bg-accent">
              <span className="absolute inset-0 rounded-full bg-accent animate-ping" />
            </span>
            Live
          </span>
        )}
      </div>
      <div className="space-y-5 relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar name={nameA1} size={36} />
            {nameA2 && <Avatar name={nameA2} size={36} />}
            <Marquee className="flex-1 min-w-0">
              <span className={`font-display text-[19px] leading-tight ${aLead ? 'text-paper font-bold' : 'text-paper/55 font-semibold'}`}>
                {klast(nameA1)}{nameA2 ? ` / ${klast(nameA2)}` : ''}
              </span>
            </Marquee>
          </div>
          <span className={`font-mono tnum font-bold text-[48px] leading-none shrink-0 ${aLead ? 'text-accent' : 'text-paper/70'}`}>
            {hasScore ? match.scoreA : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar name={nameB1} size={36} />
            {nameB2 && <Avatar name={nameB2} size={36} />}
            <Marquee className="flex-1 min-w-0">
              <span className={`font-display text-[19px] leading-tight ${bLead ? 'text-paper font-bold' : 'text-paper/55 font-semibold'}`}>
                {klast(nameB1)}{nameB2 ? ` / ${klast(nameB2)}` : ''}
              </span>
            </Marquee>
          </div>
          <span className={`font-mono tnum font-bold text-[48px] leading-none shrink-0 ${bLead ? 'text-accent' : 'text-paper/70'}`}>
            {hasScore ? match.scoreB : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Courts panel ───────────────────────────────────────────── */

function CourtsPanel({
  matches,
  isPreMatch,
  tournamentId,
}: {
  matches: Match[]
  isPreMatch: boolean
  tournamentId: string
}) {
  const [activePage, pageIdx, pageCount] = useRotatingPages(matches, 4, ROTATE_MS)

  return (
    <div className="min-h-0 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="font-display font-bold text-[22px] tracking-tight flex items-center gap-2.5 whitespace-nowrap">
          <CourtIcon className="w-6 h-6 text-accent shrink-0" />
          On court now
        </h2>
        {pageCount > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: pageCount }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === pageIdx ? 'w-6 bg-accent' : 'w-1.5 bg-white/20'}`} />
            ))}
          </div>
        )}
      </div>
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          {isPreMatch && <JoinQR tournamentId={tournamentId} size={160} tone="dark" />}
          <span className="text-paper/30 text-lg">{isPreMatch ? 'Waiting for players…' : 'No matches yet'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 flex-1 min-h-0 content-start">
          {activePage.map(m => <CourtCard key={m._id} match={m} />)}
        </div>
      )}
    </div>
  )
}

/* ─── Leaderboard ────────────────────────────────────────────── */

function BoardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const medal =
    rank === 1 ? 'bg-accent text-ink' :
    rank === 2 ? 'bg-paper/25 text-paper' :
    rank === 3 ? 'bg-paper/15 text-paper' : ''
  return (
    <div className="grid grid-cols-[36px_1fr_54px] items-center gap-3 py-1.5 border-b border-white/6 last:border-0">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-[15px] tnum ${medal || 'text-paper/40'}`}>
        {rank}
      </span>
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={entry.displayName} size={30} />
        <span className="font-semibold text-[16px] truncate">{entry.displayName}</span>
      </div>
      <span className="font-mono tnum font-bold text-[18px] text-right">{entry.points}</span>
    </div>
  )
}

function BoardList({ rows }: { rows: LeaderboardEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const track = el.firstElementChild as HTMLElement
    if (!track) return
    const check = () => {
      const overflow = track.scrollHeight - el.clientHeight
      if (overflow > 4) {
        el.classList.add('is-scrolling')
        el.style.setProperty('--board-shift', `-${overflow}px`)
        el.style.setProperty('--board-duration', `${Math.max(10, overflow / 12)}s`)
      } else {
        el.classList.remove('is-scrolling')
      }
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [rows])
  return (
    <div ref={ref} className="board-mask scrollbar-none overflow-hidden flex-1 min-h-0">
      <div className="board-track">
        {rows.map((r, i) => <BoardRow key={r._id} entry={r} rank={i + 1} />)}
      </div>
    </div>
  )
}

/* ─── Footer ticker ──────────────────────────────────────────── */

function TickerMarquee({ matches }: { matches: Match[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const track = el.firstElementChild as HTMLElement
    if (!track) return
    const check = () => {
      const overflow = track.scrollWidth - el.clientWidth
      if (overflow > 4) {
        el.classList.add('is-overflowing')
        el.style.setProperty('--ticker-shift', `-${overflow + 40}px`)
        el.style.setProperty('--ticker-duration', `${Math.max(16, overflow / 40)}s`)
      } else {
        el.classList.remove('is-overflowing')
      }
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [matches])

  return (
    <footer className="shrink-0 h-16 border-t border-white/8 bg-white/[0.03] flex items-center gap-5 px-6">
      <span className="shrink-0 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-accent">
        <ClockIcon /> Up next
      </span>
      <div ref={ref} className="ticker-mask flex-1 min-w-0 overflow-hidden">
        <div className="ticker-track flex items-center gap-10 whitespace-nowrap">
          {matches.map(m => {
            const a1 = klast(participantName(m.pairA?.participantA))
            const a2 = klast(participantName(m.pairA?.participantB))
            const b1 = klast(participantName(m.pairB?.participantA))
            const b2 = klast(participantName(m.pairB?.participantB))
            return (
              <span key={m._id} className="inline-flex items-center gap-3 text-[16px] font-semibold text-paper/80">
                {a1} / {a2}
                <span className="text-paper/30">vs</span>
                {b1} / {b2}
                <span className="text-[12px] font-bold uppercase tracking-wide text-paper/40">Court {m.courtNumber}</span>
              </span>
            )
          })}
        </div>
      </div>
    </footer>
  )
}

/* ─── Round timer ────────────────────────────────────────────── */

function playFinalPointAlert() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const playTone = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'square'
      gain.gain.setValueAtTime(vol, now + start)
      gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur)
      osc.start(now + start)
      osc.stop(now + start + dur)
    }
    playTone(660, 0, 0.2, 0.4)
    playTone(880, 0.25, 0.2, 0.4)
    playTone(1100, 0.5, 0.5, 0.5)
    setTimeout(() => ctx.close(), 1500)
  } catch {}
  try {
    const u = new SpeechSynthesisUtterance('Final point!')
    u.rate = 0.9; u.pitch = 1.1; u.volume = 1
    speechSynthesis.speak(u)
  } catch {}
}

function RoundTimer({ durationMs, startedAt }: { durationMs: number; startedAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, durationMs - (Date.now() - startedAt)))
  const [showOverlay, setShowOverlay] = useState(false)
  const beeped = useRef(false)

  useEffect(() => {
    const tick = setInterval(() => {
      const left = Math.max(0, durationMs - (Date.now() - startedAt))
      setRemaining(left)
      if (left <= 0 && !beeped.current) {
        beeped.current = true
        playFinalPointAlert()
        setShowOverlay(true)
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [durationMs, startedAt])

  useEffect(() => {
    beeped.current = false
    setShowOverlay(false)
  }, [startedAt])

  const totalSec = Math.ceil(remaining / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const expired = remaining <= 0
  const warning = remaining > 0 && remaining <= 30_000

  return (
    <>
      <div className="hidden md:flex items-center gap-3 rounded-full bg-white/[0.06] ring-1 ring-white/10 pl-3 pr-4 h-10 shrink-0">
        <ClockIcon className="w-4 h-4 text-accent shrink-0" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-paper/40 whitespace-nowrap">Round ends in</span>
        <span className={`font-mono tnum font-bold text-[18px] whitespace-nowrap ${expired ? 'text-red-400 animate-pulse' : warning ? 'text-amber-400' : ''}`}>
          {expired ? 'TIME' : `${min}:${String(sec).padStart(2, '0')}`}
        </span>
      </div>
      {showOverlay && <FinalPointOverlay onDismiss={() => setShowOverlay(false)} />}
    </>
  )
}

function FinalPointOverlay({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-center animate-pulse">
        <div className="text-[120px] leading-none font-display font-bold tracking-tight text-red-500 drop-shadow-[0_0_60px_rgba(239,68,68,0.5)]">
          FINAL POINT
        </div>
        <div className="text-paper/40 text-[18px] mt-4 font-medium">
          Finish your rally — this is the last point
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */

function KioskPage() {
  const { tournamentId } = useParams({ from: '/kiosk/$tournamentId' })
  const [tab, setTab] = useState<'courts' | 'board'>('courts')
  const [wide, setWide] = useState(false)
  const now = useClock()

  const tournament = useQuery(api.tournaments.get, { tournamentId: tournamentId as Id<'tournaments'> })
  const rounds = useQuery(api.rounds.list, { tournamentId: tournamentId as Id<'tournaments'> })
  const leaderboard = useQuery(api.leaderboard.get, { tournamentId: tournamentId as Id<'tournaments'> })

  const activeRound = rounds?.find(r => r.state === 'in_progress') ?? rounds?.[rounds.length - 1]
  const matches = useQuery(api.matches.listByRound, activeRound ? { roundId: activeRound._id } : 'skip')

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
  const pendingMatches = sortedMatches.filter(m => m.state === 'scheduled')
  const totalRounds = rounds?.length ?? 0
  const roundState = activeRound?.state
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
              {activeRound
                ? `Round ${activeRound.roundNumber}${totalRounds > 1 ? ` of ${totalRounds}` : ''}`
                : 'Setting up…'}
            </div>
          </div>
          {isLive && tournament.roundDurationMs && activeRound?.startedAt && (
            <RoundTimer durationMs={tournament.roundDurationMs} startedAt={activeRound.startedAt} />
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
      {!wide && (
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
      {wide ? (
        <main className="flex-1 grid grid-cols-[1fr_460px] gap-7 p-8 min-h-0">
          <CourtsPanel
            matches={sortedMatches}
            isPreMatch={isPreMatch}
            tournamentId={tournamentId}
          />
          <aside className="min-h-0">
            <section className="rounded-[28px] bg-white/[0.04] ring-1 ring-white/10 p-6 flex flex-col h-full min-h-0">
              <h2 className="font-display font-bold text-[19px] tracking-tight flex items-center gap-2 mb-2 shrink-0 whitespace-nowrap">
                <TrophyIcon className="w-5 h-5 text-accent shrink-0" />
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
                <TrophyIcon className="w-5 h-5 text-accent shrink-0" />
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

      {pendingMatches.length > 0 && <TickerMarquee matches={pendingMatches} />}
    </div>
  )
}
