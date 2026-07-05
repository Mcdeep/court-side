import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useEffect, useRef, useState } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { JoinQR } from '#/components/ui/join-qr'

export const Route = createFileRoute('/kiosk/$tournamentId')({
  component: KioskPage,
})

const SCROLL_PAUSE_MS = 5_000
const SCROLL_SPEED_MS = 600
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
  const isPreMatch = tournament.state === 'draft' || tournament.state === 'registration_open'

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/8 shrink-0">
        <span className="text-white/30 text-[13px] font-mono tracking-widest uppercase">CourtOS</span>
        <h1 className="font-display font-bold text-[22px] tracking-tight">{tournament.name}</h1>
        <div className="flex items-center gap-3">
          {roundState === 'in_progress' && tournament.roundDurationMs && activeRound?.startedAt && (
            <RoundTimer durationMs={tournament.roundDurationMs} startedAt={activeRound.startedAt} />
          )}
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
          <div className={`${wide ? 'w-[58%] border-r border-white/8' : 'flex-1'} p-6 overflow-hidden`}>
            <SectionLabel>Courts</SectionLabel>
            {!matches || matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                {isPreMatch && <JoinQR tournamentId={tournamentId} size={160} tone="dark" />}
                <span className="text-white/30 text-lg">{isPreMatch ? 'Waiting for players…' : 'No matches yet'}</span>
              </div>
            ) : (
              <MarqueeScroll itemCount={matches.length}>
                {[...matches].sort((a, b) => a.courtNumber - b.courtNumber).map(m => (
                  <CourtCard key={m._id} match={m} />
                ))}
              </MarqueeScroll>
            )}
          </div>
        )}

        {/* Leaderboard panel */}
        {(wide || tab === 'board') && (
          <div className={`${wide ? 'flex-1' : 'flex-1'} p-6 overflow-hidden`}>
            <SectionLabel>Standings</SectionLabel>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white/30 text-lg">No scores yet</div>
            ) : (
              <MarqueeScroll itemCount={leaderboard.length}>
                {leaderboard.map((entry, i) => (
                  <LeaderRow key={entry._id} entry={entry} rank={i + 1} />
                ))}
              </MarqueeScroll>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Marquee scroll ────────────────────────────────────────── */
function MarqueeScroll({ children, itemCount }: { children: React.ReactNode; itemCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el || itemCount === 0) return

    const checkOverflow = () => {
      if (el.scrollHeight <= el.clientHeight) return false
      return true
    }

    if (!checkOverflow()) return

    let currentItem = 0
    const timer = setInterval(() => {
      const items = el.children
      if (!items.length) return
      currentItem = (currentItem + 1) % items.length
      const target = items[currentItem] as HTMLElement
      if (!target) return
      setOffset(target.offsetTop)

      if (currentItem === 0) {
        setTimeout(() => setOffset(0), SCROLL_SPEED_MS)
      }
    }, SCROLL_PAUSE_MS)

    return () => clearInterval(timer)
  }, [itemCount])

  return (
    <div className="mt-4 h-[calc(100%-2rem)] overflow-hidden relative">
      <div
        ref={containerRef}
        className="space-y-3 transition-transform ease-in-out"
        style={{
          transform: `translateY(-${offset}px)`,
          transitionDuration: `${SCROLL_SPEED_MS}ms`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ─── Round timer ───────────────────────────────────────────── */
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
    const utterance = new SpeechSynthesisUtterance('Final point!')
    utterance.rate = 0.9
    utterance.pitch = 1.1
    utterance.volume = 1
    speechSynthesis.speak(utterance)
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
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-[18px] font-bold tnum
        ${expired ? 'bg-red-500/20 text-red-400 animate-pulse' : warning ? 'bg-amber-500/15 text-amber-400' : 'bg-white/8 text-white'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden>
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />
        </svg>
        {expired ? 'TIME' : `${min}:${String(sec).padStart(2, '0')}`}
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
        <div className="text-white/40 text-[18px] mt-4 font-medium">
          Finish your rally — this is the last point
        </div>
      </div>
    </div>
  )
}

/* ─── Shared components ─────────────────────────────────────── */
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
