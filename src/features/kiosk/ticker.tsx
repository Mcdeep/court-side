import { Icon } from '#/components/ui/icon'
import { participantName } from '#/lib/names'
import type { Match } from '#/features/tournaments/types'
import { useAutoScroll } from './hooks'

export function TickerMarquee({ matches }: { matches: Match[] }) {
  const ref = useAutoScroll<HTMLDivElement>(
    { axis: 'x', activeClass: 'is-overflowing', shiftVar: '--ticker-shift', durationVar: '--ticker-duration', minDurationSec: 16, speedDivisor: 40, extraPadding: 40 },
    [matches]
  )

  return (
    <footer className="shrink-0 h-16 border-t border-white/8 bg-white/[0.03] flex items-center gap-5 px-6">
      <span className="shrink-0 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-accent">
        <Icon name="clock" className="w-4 h-4" /> Up next
      </span>
      <div ref={ref} className="ticker-mask flex-1 min-w-0 overflow-hidden">
        <div className="ticker-track flex items-center gap-10 whitespace-nowrap">
          {matches.map(m => {
            const a1 = participantName(m.pairA?.participantA)
            const a2 = participantName(m.pairA?.participantB)
            const b1 = participantName(m.pairB?.participantA)
            const b2 = participantName(m.pairB?.participantB)
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
