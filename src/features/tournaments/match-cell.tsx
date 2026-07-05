import { Icon } from '#/components/ui/icon'
import { lastName, pairNames } from '#/lib/names'
import type { Match } from './types'

export function MatchCell({ match, onClick }: { match: Match; onClick: (match: Match) => void }) {
  const [nameA1, nameA2] = pairNames(match.pairA)
  const [nameB1, nameB2] = pairNames(match.pairB)

  const live  = match.state === 'in_progress'
  const final = match.state === 'completed'

  return (
    <button onClick={() => onClick(match)}
      className={`text-left w-full rounded-xl p-3 ring-1 transition-all hover:shadow-card hover:-translate-y-px
        ${live  ? 'bg-accent-soft ring-accent-dark/30' :
          final ? 'bg-white ring-zinc-200' :
                  'bg-zinc-50 ring-zinc-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">Court {match.courtNumber}</span>
        {live  && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink"><span className="relative inline-block w-1.5 h-1.5 rounded-full bg-ink live-ping" style={{ color: 'oklch(0.19 0.012 264)' }} />Live</span>}
        {final && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><Icon name="check" className="w-3 h-3" stroke={3} />Final</span>}
        {!live && !final && <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Scheduled</span>}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-ink">
          <span className="text-[13.5px] truncate font-semibold min-w-0 flex-1">
            {lastName(nameA1)} <span className="text-zinc-300 font-normal">/</span> {lastName(nameA2)}
          </span>
          <span className={`font-mono tnum text-[15px] shrink-0 font-bold
            ${match.scoreA === undefined ? 'text-zinc-300 font-normal' :
              match.scoreA > (match.scoreB ?? 0) ? '' : 'text-ink-mute'}`}>
            {match.scoreA ?? '–'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-ink">
          <span className="text-[13.5px] truncate font-semibold min-w-0 flex-1">
            {lastName(nameB1)} <span className="text-zinc-300 font-normal">/</span> {lastName(nameB2)}
          </span>
          <span className={`font-mono tnum text-[15px] shrink-0 font-bold
            ${match.scoreB === undefined ? 'text-zinc-300 font-normal' :
              match.scoreB > (match.scoreA ?? 0) ? '' : 'text-ink-mute'}`}>
            {match.scoreB ?? '–'}
          </span>
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[11px] text-ink-mute font-medium">
          {match.state === 'scheduled' ? 'Tap to start' : match.state === 'in_progress' ? 'Update score' : 'Edit result'}
        </span>
        <Icon name="pencil" className="w-3.5 h-3.5 text-zinc-300" />
      </div>
    </button>
  )
}
