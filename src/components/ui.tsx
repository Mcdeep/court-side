import React from 'react'

/* ─── Icons ──────────────────────────────────────────────────── */
const PATHS: Record<string, string> = {
  grid:    'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  trophy:  'M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 14h6M10 14l-1 4h6l-1-4M8 22h8',
  users:   'M16 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM4 20a6 6 0 0 1 12 0M17.5 11a3 3 0 0 0 0-6M20 20a5.5 5.5 0 0 0-4-5.3',
  court:   'M3 5h18v14H3zM12 5v14M3 9h4v6H3zM17 9h4v6h-4z',
  gear:    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.3 2.5h4l.3-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5A7 7 0 0 0 19 12z',
  search:  'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  plus:    'M12 5v14M5 12h14',
  chevR:   'M9 6l6 6-6 6',
  chevL:   'M15 6l-6 6 6 6',
  back:    'M19 12H5M11 18l-6-6 6-6',
  x:       'M6 6l12 12M18 6L6 18',
  check:   'M5 12l4.5 4.5L19 7',
  bolt:    'M13 2 4 14h7l-1 8 9-12h-7z',
  clock:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  cal:     'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  dots:    'M5 12h.01M12 12h.01M19 12h.01',
  archive: 'M21 8H3M21 8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M21 8L18 3H6L3 8M10 11h4',
  trash:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  pencil:  'M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3z',
  shuffle: 'M16 3h5v5M21 3l-7 7M4 20l6-6M4 4l5 5M16 21h5v-5M14 14l7 7',
  filter:  'M3 5h18l-7 8v6l-4-2v-4z',
  flag:    'M5 21V4M5 4h12l-2 4 2 4H5',
  medal:   'M8 3l4 7 4-7M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 16.5l1.4.9-.4-1.6 1.2-1-1.6-.1L12 13l-.6 1.6-1.6.1 1.2 1-.4 1.6z',
}

export function Icon({ name, className = 'w-5 h-5', stroke = 2 }: {
  name: keyof typeof PATHS
  className?: string
  stroke?: number
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}

/* ─── Avatar ─────────────────────────────────────────────────── */
const PALETTES = [
  'oklch(0.9 0.05 250)', 'oklch(0.9 0.06 30)', 'oklch(0.9 0.06 150)',
  'oklch(0.9 0.06 320)', 'oklch(0.9 0.06 80)', 'oklch(0.9 0.06 200)',
]

export function initials(name: string) {
  return name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
}

export function Avatar({ name, size = 32, tone = 'paper' }: {
  name: string
  size?: number
  tone?: 'paper' | 'dark'
}) {
  const code = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = tone === 'dark' ? 'oklch(0.3 0.012 264)' : PALETTES[code % PALETTES.length]
  const fg = tone === 'dark' ? 'oklch(0.92 0.01 264)' : 'oklch(0.32 0.04 264)'
  return (
    <span className="inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

/* ─── Button ─────────────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'ink' | 'ghost' | 'outline'
type ButtonSize    = 'sm' | 'md' | 'lg'

const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
}
const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-ink font-bold hover:brightness-105 shadow-[0_1px_0_oklch(0.6_0.16_140)] active:translate-y-px',
  ink:     'bg-ink text-paper font-semibold hover:bg-ink-soft active:translate-y-px',
  ghost:   'bg-transparent text-ink-mute hover:bg-ink/5 hover:text-ink font-medium',
  outline: 'bg-white text-ink font-semibold ring-1 ring-zinc-200 hover:ring-zinc-300 hover:bg-zinc-50',
}

export function Button({ children, variant = 'primary', size = 'md', icon, iconR, className = '', ...rest }: {
  children?: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: keyof typeof PATHS
  iconR?: keyof typeof PATHS
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest}
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-150 whitespace-nowrap ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`}>
      {icon && <Icon name={icon} className="w-[1.05em] h-[1.05em]" stroke={2.4} />}
      {children}
      {iconR && <Icon name={iconR} className="w-[1.05em] h-[1.05em]" stroke={2.4} />}
    </button>
  )
}

/* ─── StatusChip ─────────────────────────────────────────────── */
type Status = 'draft' | 'live' | 'completed' | 'scheduled' | 'final'

const CHIP_MAP: Record<Status, { label: string; cls: string; dot: string; live?: boolean; check?: boolean }> = {
  draft:     { label: 'Draft',     cls: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200',                     dot: 'bg-zinc-400' },
  live:      { label: 'Live',      cls: 'bg-accent text-ink ring-1 ring-inset ring-accent-dark/30 font-bold',             dot: 'bg-ink', live: true },
  completed: { label: 'Completed', cls: 'bg-ink text-paper ring-1 ring-inset ring-ink',                                   dot: 'bg-accent', check: true },
  scheduled: { label: 'Scheduled', cls: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200',                     dot: 'bg-zinc-300' },
  final:     { label: 'Final',     cls: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200',                     dot: 'bg-zinc-400' },
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

/* ─── SegTabs ────────────────────────────────────────────────── */
export function SegTabs({ tabs, value, onChange }: {
  tabs: { id: string; label: string; count?: number }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`h-8 px-3.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5
            ${value === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink'}`}>
          {t.label}
          {t.count != null && (
            <span className={`tnum text-[11px] px-1.5 rounded-full ${value === t.id ? 'bg-accent text-ink' : 'bg-zinc-200 text-zinc-500'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ─── TeamMark ───────────────────────────────────────────────── */
export function TeamMark({ names, size = 26 }: { names: string[]; size?: number }) {
  return (
    <span className="inline-flex" style={{ marginRight: size * 0.35 }}>
      {names.map((name, i) => (
        <span key={i} style={{ marginLeft: i ? -size * 0.35 : 0, zIndex: 2 - i }}
          className="ring-2 ring-white rounded-full inline-flex">
          <Avatar name={name} size={size} />
        </span>
      ))}
    </span>
  )
}
