import { participantName } from '#/lib/names'
import type { Match } from '#/features/tournaments/types'
import { Avatar } from './avatar'
import { Marquee } from './marquee'
import { klast } from './format'

export function CourtCard({ match }: { match: Match }) {
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
