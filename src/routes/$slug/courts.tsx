import { createFileRoute, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import React, { useState } from 'react'
import type { Id } from '#/../convex/_generated/dataModel'
import { Button, Icon } from '#/components/ui'

export const Route = createFileRoute('/$slug/courts')({
  component: CourtsPage,
})

function CourtsPage() {
  const { slug } = useParams({ from: '/$slug/courts' })
  const [showAdd, setShowAdd] = useState(false)

  const org = useQuery(api.organizations.getBySlug, { slug })
  const venues = useQuery(
    api.venues.listByOrg,
    org ? { organizationId: org._id } : 'skip'
  )

  if (org === undefined || venues === undefined) return <PageSkeleton />
  if (org === null) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-ink-mute">Organisation not found.</p>
    </div>
  )

  const totalCourts = venues.reduce((sum, v) => sum + v.courtCount, 0)

  return (
    <div className="max-w-[900px] mx-auto px-10 py-8">
      {showAdd && (
        <VenueModal
          orgId={org._id}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 capitalize">{org.name}</div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Courts</h1>
        </div>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setShowAdd(true)}>
          Add venue
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        <Stat label="Venues"       value={venues.length} icon="court" />
        <Stat label="Total courts" value={totalCourts}   icon="grid"  />
      </div>

      {/* Venue list */}
      {venues.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-14 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
            <Icon name="court" className="w-8 h-8" stroke={1.8} />
          </span>
          <h3 className="font-display font-bold text-[20px]">No venues yet</h3>
          <p className="text-ink-mute text-sm mt-1 max-w-xs">
            Add a venue to start creating tournaments.
          </p>
          <div className="mt-5">
            <Button variant="primary" size="lg" icon="plus" onClick={() => setShowAdd(true)}>
              Add venue
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map(venue => (
            <VenueCard key={venue._id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  )
}

function VenueCard({ venue }: { venue: any }) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const deleteVenue = useMutation(api.venues.deleteVenue)

  async function handleDelete() {
    setWorking(true); setError('')
    try {
      await deleteVenue({ venueId: venue._id })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete')
      setWorking(false)
      setConfirm(false)
    }
  }

  if (editing) {
    return (
      <VenueEditCard venue={venue} onClose={() => setEditing(false)} />
    )
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

        {/* Court count pips */}
        <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
          {Array.from({ length: venue.courtCount }).map((_, i) => (
            <span key={i}
              className="w-8 h-8 rounded-lg bg-accent text-ink text-[12px] font-bold flex items-center justify-center tnum">
              {i + 1}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" icon="pencil" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {confirm ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirm(false)}
                className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors">
                Cancel
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="!text-red-500 !ring-red-200 hover:!bg-red-50"
                onClick={handleDelete}
                disabled={working}>
                {working ? '…' : 'Confirm'}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="!text-red-500 hover:!bg-red-50"
              onClick={() => setConfirm(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}

const INPUT_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

function VenueEditCard({ venue, onClose }: { venue: any; onClose: () => void }) {
  const [name, setName] = useState(venue.name)
  const [courtCount, setCourtCount] = useState(venue.courtCount)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const updateVenue = useMutation(api.venues.update)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await updateVenue({ venueId: venue._id, name: name.trim(), courtCount })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save')
      setSaving(false)
    }
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
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} required />
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Courts</label>
            <input
              type="number"
              min={1}
              max={20}
              value={courtCount}
              onChange={e => setCourtCount(Number(e.target.value))}
              className={`${INPUT_CLS} w-24 text-center`}
              required
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function VenueModal({ orgId, onClose }: { orgId: Id<'organizations'>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [courtCount, setCourtCount] = useState(4)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const createVenue = useMutation(api.venues.create)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name required'); return }
    setSaving(true); setError('')
    try {
      await createVenue({ organizationId: orgId, name: name.trim(), courtCount })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-paper rounded-2xl shadow-pop p-6 ring-1 ring-ink/8">
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display font-bold text-[22px] tracking-tight">Add venue</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-ink/6 text-ink-mute hover:text-ink transition-colors">
            <Icon name="x" className="w-4 h-4" stroke={2.5} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Venue name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Main Club"
              className={INPUT_CLS}
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Number of courts</label>
            <input
              type="number"
              min={1}
              max={20}
              value={courtCount}
              onChange={e => setCourtCount(Number(e.target.value))}
              className={INPUT_CLS}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Creating…' : 'Add venue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white ring-1 ring-zinc-200/80 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute">{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-100 text-zinc-400">
          <Icon name={icon as any} className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 font-display font-bold text-[30px] leading-none tnum">{value}</div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-28 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-2 gap-4 mb-7">
        {[0, 1].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="space-y-3">
        {[0, 1].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
    </div>
  )
}
