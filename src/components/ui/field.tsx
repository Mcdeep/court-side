import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
