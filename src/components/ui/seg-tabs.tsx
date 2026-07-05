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
