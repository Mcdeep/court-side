import { useMemo, useState } from 'react'
import { Avatar } from '#/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { getRankingOrder, TIEBREAK_LABELS } from '#/../convex/lib/tiebreaks'
import type { Tiebreak } from '#/../convex/lib/tiebreaks'
import type { LeaderboardEntry } from './types'

type SortField = 'rank' | 'played' | 'wins' | 'losses' | 'pointDiff' | 'points'

export function StandingsTab({ leaderboard, tiebreakOrder }: {
  leaderboard: LeaderboardEntry[]; tiebreakOrder?: readonly Tiebreak[]
}) {
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const showDifference = leaderboard.some(entry => entry.pointDiff !== null)
  const sorted = useMemo(() => {
    const direction = sortDir === 'asc' ? 1 : -1
    return [...leaderboard].sort((a, b) => ((a[sortField] ?? 0) - (b[sortField] ?? 0)) * direction)
  }, [leaderboard, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir(direction => direction === 'desc' ? 'asc' : 'desc')
    else {
      setSortField(field)
      setSortDir(field === 'rank' ? 'asc' : 'desc')
    }
  }

  if (leaderboard.length === 0) {
    return <div className="text-ink-mute text-sm bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-10 text-center">Standings appear once the first round is scored.</div>
  }
  const columns: { field: SortField; label: string }[] = [
    { field: 'played', label: 'GP' }, { field: 'wins', label: 'Won' }, { field: 'losses', label: 'Lost' },
    ...(showDifference ? [{ field: 'pointDiff' as const, label: 'Diff' }] : []), { field: 'points', label: 'Pts' },
  ]

  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
      {leaderboard.some(entry => entry.tiebreaksUnavailable) && (
        <p className="px-5 py-3 text-sm text-ink-mute border-b border-zinc-100">
          Some older match results are missing. Standings and rating awards use total points until they are restored. Open a missing match score in the schedule to restore it.
        </p>
      )}
      {showDifference && (
        <p className="px-5 py-3 text-xs text-ink-mute border-b border-zinc-100">
          {getRankingOrder(tiebreakOrder).map(rule => TIEBREAK_LABELS[rule]).join(' → ')}. Equal results share a position.
        </p>
      )}
      <Table aria-label="Standings" className="min-w-[500px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 pl-5" aria-sort={sortField === 'rank' ? sortDir === 'asc' ? 'ascending' : 'descending' : undefined}>
              <SortHeader label="#" field="rank" sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Player</TableHead>
            {columns.map(({ field, label }) => (
              <TableHead key={field} className="w-16 last:pr-5" aria-sort={sortField === field ? sortDir === 'asc' ? 'ascending' : 'descending' : undefined}>
                <SortHeader label={label} field={field} sortField={sortField} sortDir={sortDir} onClick={toggleSort} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(entry => (
            <TableRow key={entry._id} className={entry.rank <= 3 ? 'bg-accent-soft/40' : ''}>
              <TableCell className="pl-5">
                <span aria-label={entry.tied ? `Tied for position ${entry.rank}` : `Position ${entry.rank}`}
                  className={`tnum font-display font-bold text-[15px] min-w-8 h-8 px-1 rounded-lg inline-flex items-center justify-center
                    ${entry.rank === 1 ? 'bg-accent text-ink' : entry.rank <= 3 ? 'bg-ink text-paper' : 'text-ink-mute'}`}>
                  {entry.tied ? '=' : ''}{entry.rank}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center shrink-0">
                    {entry.players.map((player, index) => <Avatar key={index} name={player.displayName} size={28} className={index > 0 ? '-ml-2 ring-2 ring-white' : ''} />)}
                  </div>
                  <span className="font-semibold text-sm">{entry.players.map(player => player.displayName).join(' / ')}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tnum text-ink-mute">{entry.played}</TableCell>
              <TableCell className="text-right tnum text-ink-mute">{entry.wins}</TableCell>
              <TableCell className="text-right tnum text-ink-mute">{entry.losses}</TableCell>
              {showDifference && <TableCell className="text-right tnum text-ink-mute">{entry.pointDiff === null ? '—' : entry.pointDiff > 0 ? `+${entry.pointDiff}` : String(entry.pointDiff).replace('-', '−')}</TableCell>}
              <TableCell className="text-right pr-5 tnum font-mono font-bold text-[15px]">{entry.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SortHeader({ label, field, sortField, sortDir, onClick }: {
  label: string; field: SortField; sortField: SortField; sortDir: 'asc' | 'desc'; onClick: (field: SortField) => void
}) {
  const active = sortField === field
  return (
    <button type="button" onClick={() => onClick(field)}
      className={`flex w-full items-center ${field === 'rank' ? 'justify-start' : 'justify-end'} gap-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${active ? 'text-ink' : 'text-zinc-400 hover:text-zinc-600'}`}>
      {label}<span aria-hidden className={`text-[9px] ${active ? 'opacity-100' : 'opacity-0'}`}>{sortDir === 'desc' ? '▼' : '▲'}</span>
    </button>
  )
}
