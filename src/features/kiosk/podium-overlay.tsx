import { useEffect, useState } from 'react'
import type { LeaderboardEntry } from '#/features/tournaments/types'
import { Icon } from '#/components/ui/icon'
import { Avatar } from './avatar'

const REVEAL_MS = 900

export function PodiumOverlay({ tournamentName, top3, onDismiss }: {
  tournamentName: string; top3: LeaderboardEntry[]; onDismiss: () => void
}) {
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const timers = top3.map((_, i) =>
      setTimeout(() => setRevealed(r => Math.max(r, i + 1)), i * REVEAL_MS)
    )
    return () => timers.forEach(clearTimeout)
    // Reveal sequence should run once when the podium mounts, not on every
    // parent re-render (the kiosk clock ticks every second) — top3 is stable
    // in practice since the tournament is already completed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const order = [1, 0, 2].filter(i => i < top3.length)

  return (
    <button
      onClick={onDismiss}
      className="fixed inset-0 z-50 bg-ink text-paper flex flex-col items-center justify-center gap-10 cursor-pointer select-none"
    >
      <div className="text-center">
        <div className="text-[13px] font-bold uppercase tracking-[0.2em] text-accent mb-2">Tournament complete</div>
        <h1 className="font-display font-bold text-[34px] tracking-tight">{tournamentName}</h1>
      </div>

      <div className="flex items-end gap-6">
        {order.map(i => {
          const entry = top3[i]
          const rank = i + 1
          const show = revealed > i
          const height = rank === 1 ? 220 : rank === 2 ? 170 : 140
          const medal = rank === 1 ? 'bg-accent text-ink' : rank === 2 ? 'bg-paper/25 text-paper' : 'bg-paper/15 text-paper'
          return (
            <div
              key={entry._id}
              className={`flex flex-col items-center gap-3 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              <Avatar name={entry.displayName} size={rank === 1 ? 64 : 52} />
              <div className="text-center">
                <div className="font-display font-bold text-[18px] leading-tight">{entry.displayName}</div>
                <div className="font-mono tnum text-[14px] text-paper/50">{entry.points} pts</div>
              </div>
              <div
                style={{ height }}
                className={`w-28 rounded-t-2xl flex items-start justify-center pt-3 ${medal}`}
              >
                <span className="font-display font-bold text-[28px]">{rank}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 text-paper/40 text-[13px] font-medium">
        <Icon name="check" className="w-4 h-4" />
        Tap anywhere to see the full stats
      </div>
    </button>
  )
}
