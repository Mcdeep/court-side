const PALETTES = [
  'oklch(0.9 0.05 250)', 'oklch(0.9 0.06 30)', 'oklch(0.9 0.06 150)',
  'oklch(0.9 0.06 320)', 'oklch(0.9 0.06 80)', 'oklch(0.9 0.06 200)',
]

export function initials(name: string) {
  return name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
}

export function Avatar({ name, size = 32, tone = 'paper', className = '' }: {
  name: string
  size?: number
  tone?: 'paper' | 'dark'
  className?: string
}) {
  const code = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = tone === 'dark' ? 'oklch(0.3 0.012 264)' : PALETTES[code % PALETTES.length]
  const fg = tone === 'dark' ? 'oklch(0.92 0.01 264)' : 'oklch(0.32 0.04 264)'
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}
