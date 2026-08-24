import { useAutoScroll } from './hooks'

export function Marquee({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useAutoScroll<HTMLDivElement>(
    { axis: 'x', activeClass: 'is-overflowing', shiftVar: '--marquee-shift', extraPadding: 12 },
    [children]
  )
  return (
    <div ref={ref} className={`marquee-mask overflow-hidden ${className}`}>
      <span className="marquee-track inline-block whitespace-nowrap">{children}</span>
    </div>
  )
}
