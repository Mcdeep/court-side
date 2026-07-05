import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { AppDialog } from '#/components/app-dialog'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { Input } from '#/components/ui/input'
import { useAsyncAction } from '#/hooks/use-async-action'

export function AddPlayerModal({ tournamentId, existingIds, onClose }: {
  tournamentId: Id<'tournaments'>
  existingIds: Id<'users'>[]
  onClose: () => void
}) {
  const [mode, setMode] = useState<'walkin' | 'member'>('walkin')
  const [walkInName, setWalkInName] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<Id<'users'>>>(new Set())
  const [addedCount, setAddedCount] = useState(0)
  const { working, error, setError, run } = useAsyncAction()

  const allUsers = useQuery(api.users.list)
  const addParticipant = useMutation(api.participants.add)

  const filtered = (allUsers ?? [])
    .filter(u => !existingIds.includes(u._id))
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))

  async function addWalkIn() {
    if (!walkInName.trim()) { setError('Enter a name'); return }
    await run(async () => {
      await addParticipant({ tournamentId, isWalkIn: true, walkInName: walkInName.trim(), entryType: 'solo' })
      setWalkInName('')
      setAddedCount(c => c + 1)
    })
  }

  function toggleSelect(userId: Id<'users'>) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function addSelected() {
    if (selected.size === 0) return
    await run(async () => {
      for (const userId of selected) {
        await addParticipant({ tournamentId, userId, isWalkIn: false, entryType: 'solo' })
        setAddedCount(c => c + 1)
      }
      setSelected(new Set())
      setSearch('')
    })
  }

  return (
    <AppDialog
      open
      onOpenChange={o => !o && onClose()}
      title={<>
        Add player
        {addedCount > 0 && (
          <span className="ml-2 text-[12px] font-semibold text-accent-dark bg-accent-soft px-2 py-0.5 rounded-full align-middle">
            {addedCount} added
          </span>
        )}
      </>}
    >
      <div className="flex gap-1">
        {(['walkin', 'member'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 h-8 rounded-lg text-[13px] font-semibold transition-all
              ${mode === m ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink'}`}>
            {m === 'walkin' ? 'Walk-in' : 'Member'}
          </button>
        ))}
      </div>

      {mode === 'walkin' ? (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-mute">Enter the player's name. No account needed.</p>
          <Input
            autoFocus
            value={walkInName}
            onChange={e => setWalkInName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWalkIn()}
            placeholder="Player name"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Done</Button>
            <Button variant="primary" className="flex-1" onClick={addWalkIn} disabled={working}>
              {working ? 'Adding…' : 'Add walk-in'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="max-h-60 overflow-y-auto -mx-1 space-y-0.5">
            {allUsers === undefined ? (
              <div className="text-center py-6 text-ink-mute text-sm animate-pulse">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-ink-mute text-sm">
                {search ? 'No members match.' : 'All members already added.'}
              </div>
            ) : filtered.map(u => {
              const isSelected = selected.has(u._id)
              return (
                <button key={u._id} onClick={() => toggleSelect(u._id)} disabled={working}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group text-left
                    ${isSelected ? 'bg-accent-soft' : 'hover:bg-zinc-50'}`}>
                  <span className={`w-5 h-5 rounded-md ring-1 flex items-center justify-center shrink-0 transition-colors
                    ${isSelected ? 'bg-accent-dark ring-accent-dark text-white' : 'ring-zinc-300 bg-white'}`}>
                    {isSelected && <Icon name="check" className="w-3.5 h-3.5" stroke={3} />}
                  </span>
                  <Avatar name={u.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm">{u.name}</div>
                    <div className="text-[12px] text-ink-mute">{u.email}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Done</Button>
            <Button variant="primary" className="flex-1" onClick={addSelected} disabled={working || selected.size === 0}>
              {working ? 'Adding…' : selected.size > 0 ? `Add ${selected.size} player${selected.size !== 1 ? 's' : ''}` : 'Add players'}
            </Button>
          </div>
        </div>
      )}
    </AppDialog>
  )
}
