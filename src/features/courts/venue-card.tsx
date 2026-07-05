import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Icon } from '#/components/ui/icon'
import { Input } from '#/components/ui/input'
import { useAsyncAction } from '#/hooks/use-async-action'

export function VenueCard({ venue }: { venue: any }) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { working, error, run } = useAsyncAction()
  const deleteVenue = useMutation(api.venues.deleteVenue)

  async function handleDelete() {
    const ok = await run(() => deleteVenue({ venueId: venue._id }))
    if (!ok) setConfirm(false)
  }

  if (editing) {
    return <VenueEditCard venue={venue} onClose={() => setEditing(false)} />
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-5">
      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center shrink-0">
          <Icon name="court" className="w-6 h-6" stroke={2} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[16px]">{venue.name}</div>
          <div className="text-[13px] text-ink-mute mt-0.5">
            {venue.courtCount} court{venue.courtCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
          {Array.from({ length: venue.courtCount }).map((_, i) => (
            <span key={i} className="w-8 h-8 rounded-lg bg-accent text-ink text-[12px] font-bold flex items-center justify-center tnum">
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" icon="pencil" onClick={() => setEditing(true)}>Edit</Button>
          {confirm ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirm(false)}
                className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors">
                Cancel
              </button>
              <Button variant="ghost" size="sm" className="!text-red-500 !ring-red-200 hover:!bg-red-50" onClick={handleDelete} disabled={working}>
                {working ? '…' : 'Confirm'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="!text-red-500 hover:!bg-red-50" onClick={() => setConfirm(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}

function VenueEditCard({ venue, onClose }: { venue: any; onClose: () => void }) {
  const [name, setName] = useState(venue.name)
  const [courtCount, setCourtCount] = useState(venue.courtCount)
  const { working, error, run } = useAsyncAction()
  const updateVenue = useMutation(api.venues.update)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      await updateVenue({ venueId: venue._id, name: name.trim(), courtCount })
      onClose()
    })
  }

  return (
    <div className="bg-white rounded-2xl ring-2 ring-accent-dark/30 shadow-card p-5">
      <form onSubmit={save}>
        <div className="flex items-center gap-4 mb-4">
          <span className="w-12 h-12 rounded-xl bg-accent/20 text-accent-dark flex items-center justify-center shrink-0">
            <Icon name="pencil" className="w-5 h-5" stroke={2} />
          </span>
          <div className="font-semibold text-[15px]">Edit venue</div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <Field label="Name">
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} required />
          </Field>
          <Field label="Courts">
            <Input type="number" min={1} max={20} value={courtCount} onChange={e => setCourtCount(Number(e.target.value))} className="w-24 text-center" required />
          </Field>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={working}>
            {working ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
