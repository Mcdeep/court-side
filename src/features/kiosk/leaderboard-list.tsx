import type { LeaderboardEntry } from '#/features/tournaments/types'
import { Avatar } from './avatar'
import { useAutoScroll } from './hooks'

function BoardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const medal =
    rank === 1 ? 'bg-accent text-ink' :
    rank === 2 ? 'bg-paper/25 text-paper' :
    rank === 3 ? 'bg-paper/15 text-paper' : ''
  const name = entry.players.map(p => p.displayName).join(' / ')
  return (
    <div className="grid grid-cols-[36px_1fr_54px] items-center gap-3 py-1.5 border-b border-white/6 last:border-0">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-[15px] tnum ${medal || 'text-paper/40'}`}>
        {rank}
      </span>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center shrink-0">
          {entry.players.map((p, pi) => (
            <Avatar key={pi} name={p.displayName} size={30} className={pi > 0 ? '-ml-2' : ''} />
          ))}
        </div>
        <span className="font-semibold text-[16px] truncate">{name}</span>
      </div>
      <span className="font-mono tnum font-bold text-[18px] text-right">{entry.points}</span>
    </div>
  )
}

export function BoardList({ rows }: { rows: LeaderboardEntry[] }) {
  const ref = useAutoScroll<HTMLDivElement>(
    { axis: 'y', activeClass: 'is-scrolling', shiftVar: '--board-shift', durationVar: '--board-duration', minDurationSec: 10, speedDivisor: 12 },
    [rows]
  )
  return (
    <div ref={ref} className="board-mask scrollbar-none overflow-hidden flex-1 min-h-0">
      <div className="board-track">
        {rows.map((r, i) => <BoardRow key={r._id} entry={r} rank={i + 1} />)}
      </div>
    </div>
  )
}
