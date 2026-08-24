import { Icon } from '#/components/ui/icon'
import { JoinQR } from '#/components/ui/join-qr'
import type { Match } from '#/features/tournaments/types'
import { CourtCard } from './court-card'
import { useRotatingPages } from './hooks'

const ROTATE_MS = 7_000

export function CourtsPanel({
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
          <Icon name="court" className="w-6 h-6 text-accent shrink-0" stroke={2.2} />
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
