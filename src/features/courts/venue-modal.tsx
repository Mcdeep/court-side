import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { useAsyncAction } from '#/hooks/use-async-action'

export function VenueModal({ orgId, onClose }: { orgId: Id<'organizations'>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [courtCount, setCourtCount] = useState(4)
  const { working, error, setError, run } = useAsyncAction()
  const createVenue = useMutation(api.venues.create)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name required'); return }
    await run(async () => {
      await createVenue({ organizationId: orgId, name: name.trim(), courtCount })
      onClose()
    })
  }

  return (
    <AppDialog open onOpenChange={o => !o && onClose()} title="Add venue" maxWidth="sm:max-w-[420px]">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Venue name">
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Club" required />
        </Field>
        <Field label="Number of courts">
          <Input type="number" min={1} max={20} value={courtCount} onChange={e => setCourtCount(Number(e.target.value))} required />
        </Field>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={working}>
            {working ? 'Creating…' : 'Add venue'}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
