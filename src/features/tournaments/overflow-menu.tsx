import { useEffect, useRef } from 'react'
import { Icon } from '#/components/ui/icon'

export function OverflowMenu({ open, onToggle, onClose, canArchive, canDelete, onArchive, onDelete }: {
  open: boolean; onToggle: () => void; onClose: () => void
  canArchive: boolean; canDelete: boolean
  onArchive: () => void; onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button onClick={onToggle}
        className="w-9 h-9 flex items-center justify-center rounded-xl ring-1 ring-zinc-200 hover:bg-zinc-50 transition-colors">
        <Icon name="dots" className="w-4 h-4 text-ink-mute" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-pop ring-1 ring-zinc-200/80 py-1.5 z-30">
          {canArchive && (
            <button onClick={onArchive}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-ink hover:bg-zinc-50 transition-colors">
              <Icon name="archive" className="w-4 h-4 text-zinc-400" />
              Archive
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-red-500 hover:bg-red-50 transition-colors">
              <Icon name="trash" className="w-4 h-4" />
              Delete
            </button>
          )}
          {!canArchive && !canDelete && (
            <div className="px-3.5 py-2 text-[13px] text-ink-mute">No actions available</div>
          )}
        </div>
      )}
    </div>
  )
}
