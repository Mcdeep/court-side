import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { useAsyncAction } from '#/hooks/use-async-action'
import { parseImportList, type ParsedImportRow } from './parse-import-list'

export function ImportMembersModal({ organizationId, existingNames, onClose }: {
  organizationId: Id<'organizations'>
  existingNames: string[]
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const { working, error, setError, run } = useAsyncAction()
  const bulkImport = useMutation(api.members.bulkImport)

  const existingLower = useMemo(() => new Set(existingNames.map(n => n.toLowerCase())), [existingNames])

  const parsed = useMemo(() => parseImportList(text), [text])
  const seen = new Set<string>()
  const rows: (ParsedImportRow & { duplicate: boolean })[] = parsed.map(row => {
    const key = row.name.toLowerCase()
    const duplicate = existingLower.has(key) || seen.has(key)
    seen.add(key)
    return { ...row, duplicate }
  })

  const toImport = rows.filter((_, i) => !excluded.has(i))

  async function handleImport() {
    if (toImport.length === 0) { setError('Nothing to import'); return }
    const ok = await run(() => bulkImport({
      organizationId,
      rows: toImport.map(r => ({ name: r.name, startingPoints: r.startingPoints })),
    }))
    if (ok) onClose()
  }

  return (
    <AppDialog
      open
      onOpenChange={o => !o && onClose()}
      maxWidth="sm:max-w-lg"
      title="Import members"
      description="Paste one name per line. A trailing number is imported as their starting points."
    >
      <div className="space-y-3">
        <textarea
          autoFocus
          value={text}
          onChange={e => { setText(e.target.value); setExcluded(new Set()) }}
          placeholder={'John Doe    74\nAlice Wonders    71\n...'}
          rows={6}
          className="w-full rounded-xl ring-1 ring-zinc-200 bg-white px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-dark/40"
        />
        {rows.length > 0 && (
          <div className="max-h-56 overflow-y-auto -mx-1 space-y-0.5 border-t border-zinc-100 pt-2">
            {rows.map((row, i) => {
              const isExcluded = excluded.has(i)
              return (
                <div key={i}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm ${isExcluded ? 'opacity-40' : ''}`}>
                  <button
                    onClick={() => setExcluded(prev => {
                      const next = new Set(prev)
                      if (next.has(i)) next.delete(i); else next.add(i)
                      return next
                    })}
                    title={isExcluded ? 'Excluded — click to include' : 'Click to exclude'}
                    className="w-5 h-5 rounded-md ring-1 ring-zinc-300 bg-white flex items-center justify-center shrink-0">
                    {!isExcluded && <Icon name="check" className="w-3.5 h-3.5" stroke={3} />}
                  </button>
                  <span className="flex-1 truncate font-medium">{row.name}</span>
                  {row.startingPoints !== undefined && (
                    <span className="tnum text-ink-mute">{row.startingPoints} pts</span>
                  )}
                  {row.duplicate && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                      Possible duplicate
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleImport} disabled={working || toImport.length === 0}>
            {working ? 'Importing…' : `Import ${toImport.length} member${toImport.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </AppDialog>
  )
}
