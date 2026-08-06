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
  link:    'M9 15l6-6M8 17H6a4 4 0 0 1 0-8h2M16 7h2a4 4 0 0 1 0 8h-2',
  grip:    'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  screen:  'M2 4h20v13H2zM8 21h8M12 17v4',
  copy:    'M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'w-5 h-5', stroke = 2 }: {
  name: IconName
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
