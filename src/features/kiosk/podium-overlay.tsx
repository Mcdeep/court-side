import { useEffect, useState } from 'react'
import type { LeaderboardEntry } from '#/features/tournaments/types'
import { Icon } from '#/components/ui/icon'
import { Avatar } from './avatar'

const REVEAL_MS = 900

export function PodiumOverlay({ tournamentName, top3, onDismiss }: {
  tournamentName: string; top3: LeaderboardEntry[]; onDismiss: () => void
}) {
  const [revealed, setRevealed] = useState(0)
  const rankKey = [1, 2, 3].filter(rank => top3.some(entry => entry.rank === rank)).join(',')

  useEffect(() => {
    setRevealed(0)
    const timers = rankKey.split(',').filter(Boolean).map((rank, index) =>
      setTimeout(() => setRevealed(current => Math.max(current, Number(rank))), index * REVEAL_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [rankKey])

  const order = [2, 1, 3].filter(rank => top3.some(entry => entry.rank === rank))

  return (
    <button
      onClick={onDismiss}
      className="fixed inset-0 z-50 bg-ink text-paper flex flex-col items-center justify-center gap-10 cursor-pointer select-none"
    >
      <div className="text-center">
        <div className="text-[13px] font-bold uppercase tracking-[0.2em] text-accent mb-2">Tournament complete</div>
        <h1 className="font-display font-bold text-[34px] tracking-tight">{tournamentName}</h1>
      </div>

      <div className="max-h-[70vh] w-full overflow-auto px-6">
       <div className="flex w-full items-end justify-center gap-3 sm:gap-6">
        {order.map(rank => {
          const entries = top3.filter(entry => entry.rank === rank)
          const show = revealed >= rank
          const height = rank === 1 ? 220 : rank === 2 ? 170 : 140
          const medal = rank === 1 ? 'bg-accent text-ink' : rank === 2 ? 'bg-paper/25 text-paper' : 'bg-paper/15 text-paper'
          return (
            <div
              key={rank}
              className={`flex min-w-0 max-w-40 flex-1 flex-col items-center gap-3 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              {entries.map(entry => (
                <div key={entry._id} className="flex w-full flex-col items-center gap-2 text-center">
                  <div className="flex items-center">
                    {entry.players.map((player, index) => (
                      <Avatar key={index} name={player.displayName} size={rank === 1 ? 64 : 52} className={index > 0 ? '-ml-3' : ''} />
                    ))}
                  </div>
                  <div className="font-display font-bold text-xs sm:text-[18px] leading-tight break-words">{entry.players.map(player => player.displayName).join(' / ')}</div>
                  <div className="font-mono tnum text-[14px] text-paper/50">{entry.points} pts</div>
                </div>
              ))}
              <div
                style={{ height }}
                className={`w-full max-w-28 rounded-t-2xl flex items-start justify-center pt-3 ${medal}`}
              >
                <span className="font-display font-bold text-[28px]">{entries.length > 1 ? '=' : ''}{rank}</span>
              </div>
            </div>
          )
        })}
       </div>
      </div>

      <div className="flex items-center gap-1.5 text-paper/40 text-[13px] font-medium">
        <Icon name="check" className="w-4 h-4" />
        Tap anywhere to see the full stats
      </div>
    </button>
  )
}
