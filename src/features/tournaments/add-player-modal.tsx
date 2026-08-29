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

// Every participant is a roster member — someone with no account is just an
// unlinked member (see convex/members.ts), not a separate "walk-in" concept.
// Typing a brand-new name creates that roster row on the spot, so adding
// someone new still takes exactly the one step it used to.
export function AddPlayerModal({ tournamentId, organizationId, existingMemberIds, onClose }: {
  tournamentId: Id<'tournaments'>
  organizationId: Id<'organizations'>
  existingMemberIds: Id<'members'>[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [newRating, setNewRating] = useState('')
  const [selected, setSelected] = useState<Set<Id<'members'>>>(new Set())
  const [addedCount, setAddedCount] = useState(0)
  const { working, error, setError, run } = useAsyncAction()

  const roster = useQuery(api.members.listByOrg, { organizationId })
  const addMember = useMutation(api.members.add)
  const addParticipant = useMutation(api.participants.add)

  const available = (roster ?? []).filter(m => !existingMemberIds.includes(m._id))
  const filtered = available.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
  const exactMatch = available.some(m => m.name.toLowerCase() === search.trim().toLowerCase())
  const canCreate = search.trim().length > 0 && !exactMatch

  function toggleSelect(memberId: Id<'members'>) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  async function createAndSelect() {
    const name = search.trim()
    if (!name) return
    let skillRating: number | undefined
    if (newRating.trim()) {
      skillRating = Number(newRating)
      if (isNaN(skillRating) || skillRating < 1 || skillRating > 7) {
        setError('Rating must be between 1.0 and 7.0')
        return
      }
    }
    await run(async () => {
      const memberId = await addMember({ organizationId, name, skillRating })
      setSelected(prev => new Set(prev).add(memberId))
      setSearch('')
      setNewRating('')
    })
  }

  async function addSelected() {
    if (selected.size === 0) return
    await run(async () => {
      for (const memberId of selected) {
        await addParticipant({ tournamentId, memberId, entryType: 'solo' })
        setAddedCount(c => c + 1)
      }
      setSelected(new Set())
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
      <div className="space-y-3">
        <Input
          autoFocus
          value={search}
          onChange={e => { setSearch(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && canCreate && createAndSelect()}
          placeholder="Search or add a new name…"
        />
        {canCreate && (
          <div className="flex items-center gap-2 rounded-xl ring-1 ring-zinc-200 bg-zinc-50 p-2">
            <Input
              value={newRating}
              onChange={e => setNewRating(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createAndSelect()}
              placeholder="Rating (optional)"
              className="flex-1"
            />
            <Button variant="outline" size="sm" icon="plus" onClick={createAndSelect} disabled={working}>
              Add "{search.trim()}"
            </Button>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="max-h-60 overflow-y-auto -mx-1 space-y-0.5">
          {roster === undefined ? (
            <div className="text-center py-6 text-ink-mute text-sm animate-pulse">Loading…</div>
          ) : filtered.length === 0 ? (
            !canCreate && (
              <div className="text-center py-6 text-ink-mute text-sm">
                {search ? 'No members match.' : 'All members already added.'}
              </div>
            )
          ) : filtered.map(m => {
            const isSelected = selected.has(m._id)
            return (
              <button key={m._id} onClick={() => toggleSelect(m._id)} disabled={working}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group text-left
                  ${isSelected ? 'bg-accent-soft' : 'hover:bg-zinc-50'}`}>
                <span className={`w-5 h-5 rounded-md ring-1 flex items-center justify-center shrink-0 transition-colors
                  ${isSelected ? 'bg-accent-dark ring-accent-dark text-white' : 'ring-zinc-300 bg-white'}`}>
                  {isSelected && <Icon name="check" className="w-3.5 h-3.5" stroke={3} />}
                </span>
                <Avatar name={m.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{m.name}</div>
                  <div className="text-[12px] text-ink-mute">{m.email ?? 'Not linked to an account'}</div>
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
    </AppDialog>
  )
}
