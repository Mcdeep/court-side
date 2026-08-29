import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useAsyncAction } from '#/hooks/use-async-action'

export function AddMemberModal({ organizationId, onClose }: {
  organizationId: Id<'organizations'>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [skillRating, setSkillRating] = useState('')
  const { working, error, setError, run } = useAsyncAction()
  const addMember = useMutation(api.members.add)

  async function handleAdd() {
    if (!name.trim()) { setError('Enter a name'); return }
    let rating: number | undefined
    if (skillRating.trim()) {
      rating = Number(skillRating)
      if (isNaN(rating) || rating < 1 || rating > 7) {
        setError('Rating must be between 1.0 and 7.0')
        return
      }
    }
    const ok = await run(() => addMember({ organizationId, name: name.trim(), skillRating: rating }))
    if (ok) onClose()
  }

  return (
    <AppDialog open onOpenChange={o => !o && onClose()} title="Add member">
      <div className="space-y-3">
        <Input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Full name"
        />
        <Input
          value={skillRating}
          onChange={e => setSkillRating(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Skill rating (optional, e.g. Playtomic 3.5)"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={working}>
            {working ? 'Adding…' : 'Add member'}
          </Button>
        </div>
      </div>
    </AppDialog>
  )
}
