type Status = 'draft' | 'live' | 'completed' | 'scheduled' | 'final'

const CHIP_MAP: Record<Status, { label: string; cls: string; dot: string; live?: boolean }> = {
  draft:     { label: 'Draft',     cls: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200',                 dot: 'bg-zinc-400' },
  live:      { label: 'Live',      cls: 'bg-accent text-ink ring-1 ring-inset ring-accent-dark/30 font-bold',         dot: 'bg-ink', live: true },
  completed: { label: 'Completed', cls: 'bg-ink text-paper ring-1 ring-inset ring-ink',                               dot: 'bg-accent' },
  scheduled: { label: 'Scheduled', cls: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200',                 dot: 'bg-zinc-300' },
  final:     { label: 'Final',     cls: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200',                 dot: 'bg-zinc-400' },
}

export function StatusChip({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  const s = CHIP_MAP[status] ?? CHIP_MAP.draft
  const pad = size === 'sm' ? 'h-6 pl-2 pr-2.5 text-[11px]' : 'h-7 pl-2.5 pr-3 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase ${pad} ${s.cls}`}>
      <span className="relative inline-flex">
        <span className={`relative inline-block w-1.5 h-1.5 rounded-full ${s.dot} ${s.live ? 'live-ping' : ''}`}
          style={s.live ? { color: 'oklch(0.19 0.012 264)' } : undefined} />
      </span>
      {s.label}
    </span>
  )
}
