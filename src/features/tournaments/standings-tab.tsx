import { useMemo, useState } from 'react'
import { Avatar } from '#/components/ui/avatar'
import type { LeaderboardEntry } from './types'

type SortField = 'gp' | 'wins' | 'losses' | 'points'

const sortValue = (entry: LeaderboardEntry, field: SortField) =>
  field === 'gp' ? entry.wins + entry.losses :
  field === 'wins' ? entry.wins :
  field === 'losses' ? entry.losses :
  entry.points

export function StandingsTab({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const [sortField, setSortField] = useState<SortField>('points')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...leaderboard].sort((a, b) => (sortValue(a, sortField) - sortValue(b, sortField)) * dir)
  }, [leaderboard, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-ink-mute text-sm bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-10 text-center">
        Standings appear once the first round is scored.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
      <div className="grid grid-cols-[48px_1fr_60px_60px_60px_70px] gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
        <div>#</div><div>Player</div>
        <SortHeader label="GP" field="gp" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
        <SortHeader label="Won" field="wins" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
        <SortHeader label="Lost" field="losses" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
        <SortHeader label="Pts" field="points" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
      </div>
      {sorted.map((entry, i) => {
        const name = entry.players.map(p => p.displayName).join(' / ')
        return (
          <div key={entry._id}
            className={`grid grid-cols-[48px_1fr_60px_60px_60px_70px] gap-2 px-5 py-2.5 items-center border-b border-zinc-100 last:border-0 ${i < 3 ? 'bg-accent-soft/40' : ''}`}>
            <div className="flex items-center">
              <span className={`tnum font-display font-bold text-[15px] w-7 h-7 rounded-lg flex items-center justify-center
                ${i === 0 ? 'bg-accent text-ink' : i < 3 ? 'bg-ink text-paper' : 'text-ink-mute'}`}>
                {i + 1}
              </span>
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center shrink-0">
                {entry.players.map((p, pi) => (
                  <Avatar key={pi} name={p.displayName} size={28} className={pi > 0 ? '-ml-2 ring-2 ring-white' : ''} />
                ))}
              </div>
              <span className="font-semibold text-sm truncate">{name}</span>
            </div>
            <div className="text-right tnum text-sm text-ink-mute">{entry.wins + entry.losses}</div>
            <div className="text-right tnum text-sm text-ink-mute">{entry.wins}</div>
            <div className="text-right tnum text-sm text-ink-mute">{entry.losses}</div>
            <div className="text-right tnum font-mono font-bold text-[15px]">{entry.points}</div>
          </div>
        )
      })}
    </div>
  )
}

function SortHeader({ label, field, sortField, sortDir, onClick }: {
  label: string; field: SortField; sortField: SortField; sortDir: 'asc' | 'desc'; onClick: (field: SortField) => void
}) {
  const active = sortField === field
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`flex items-center justify-end gap-0.5 text-right transition-colors ${active ? 'text-ink' : 'hover:text-zinc-600'}`}
    >
      {label}
      <span className={`text-[9px] leading-none ${active ? 'opacity-100' : 'opacity-0'}`}>
        {sortDir === 'desc' ? '▼' : '▲'}
      </span>
    </button>
  )
}
