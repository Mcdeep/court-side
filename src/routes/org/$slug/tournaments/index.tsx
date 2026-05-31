import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import React, { useState } from 'react'
import { Button, Icon, SegTabs, StatusChip } from '#/components/ui'
import type { Id } from '../../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/org/$slug/tournaments/')({
  component: TournamentsPage,
})

type TournamentStatus = 'draft' | 'live' | 'completed' | 'registration_open' | 'in_progress' | 'archived' | 'published'

function normaliseStatus(state: TournamentStatus): 'draft' | 'live' | 'completed' {
  if (state === 'in_progress') return 'live'
  if (state === 'completed' || state === 'archived') return 'completed'
  return 'draft'
}

function TournamentsPage() {
  const { slug } = useParams({ from: '/org/$slug/tournaments/' })
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)

  // Look up org by slug
  const org = useQuery(api.organizations.getBySlug, { slug })

  // Fetch tournaments once we have the org
  const tournaments = useQuery(
    api.tournaments.list,
    org ? { organizationId: org._id } : 'skip'
  )

  if (org === undefined || tournaments === undefined) {
    return <PageSkeleton />
  }

  if (org === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-mute">Organisation not found.</p>
      </div>
    )
  }

  const counts = {
    all:       tournaments.length,
    live:      tournaments.filter(t => normaliseStatus(t.state as TournamentStatus) === 'live').length,
    draft:     tournaments.filter(t => normaliseStatus(t.state as TournamentStatus) === 'draft').length,
    completed: tournaments.filter(t => normaliseStatus(t.state as TournamentStatus) === 'completed').length,
  }

  const rows = tournaments.filter(t =>
    filter === 'all' || normaliseStatus(t.state as TournamentStatus) === filter
  )

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8">
      {showNew && (
        <NewTournamentModal
          orgId={org._id}
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false)
            navigate({ to: `/org/${slug}/tournaments/${id}` })
          }}
        />
      )}
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 whitespace-nowrap capitalize">
            {org.name}
          </div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Tournaments</h1>
        </div>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setShowNew(true)}>New tournament</Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Stat label="Live now"      value={counts.live}  accent sub={`across ${org.name}`} icon="bolt" />
        <Stat label="Total"         value={counts.all}   sub="tournaments"                  icon="trophy" />
        <Stat label="Completed"     value={counts.completed} sub="finished"                icon="check" />
      </div>

      {/* Filter + search row */}
      <div className="flex items-center justify-between mb-3">
        <SegTabs value={filter} onChange={setFilter} tabs={[
          { id: 'all',       label: 'All',       count: counts.all },
          { id: 'live',      label: 'Live',      count: counts.live },
          { id: 'draft',     label: 'Draft',     count: counts.draft },
          { id: 'completed', label: 'Completed', count: counts.completed },
        ]} />
        <div className="relative">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input placeholder="Search tournaments"
            className="h-9 w-60 pl-9 pr-3 rounded-xl bg-white ring-1 ring-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-dark/40" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr_1fr_auto] gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
          <div>Tournament</div>
          <div>Format</div>
          <div>Courts</div>
          <div>Progress</div>
          <div className="w-28 text-right pr-2">Status</div>
        </div>

        {rows.length === 0 && (
          <div className="px-5 py-16 text-center text-ink-mute text-sm">
            {filter === 'all' ? 'No tournaments yet. Create one to get started.' : `No ${filter} tournaments.`}
          </div>
        )}

        {rows.map(t => {
          const chipStatus = normaliseStatus(t.state as TournamentStatus)
          return (
            <button key={t._id}
              onClick={() => navigate({ to: `/org/${slug}/tournaments/${t._id}` })}
              className="rowin w-full text-left grid grid-cols-[1.6fr_1fr_0.8fr_1fr_auto] gap-4 px-5 py-4 items-center border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors group">
              {/* Name + venue */}
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                  ${chipStatus === 'live' ? 'bg-accent text-ink' : chipStatus === 'completed' ? 'bg-ink text-paper' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Icon name={t.format === 'knockout' ? 'trophy' : 'shuffle'} className="w-[18px] h-[18px]" stroke={2.2} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">{t.name}</div>
                  <div className="text-[12.5px] text-ink-mute flex items-center gap-1.5">
                    <Icon name="cal" className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{new Date(t.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </div>
              {/* Format */}
              <div className="text-sm">
                <span className="font-medium capitalize">{t.format.replace(/_/g, ' ')}</span>
              </div>
              {/* Progress bar placeholder */}
              <div className="text-sm tnum font-medium text-ink-mute">—</div>
              <div className="pr-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-zinc-100" />
                  <span className="tnum text-[12px] text-ink-mute w-9 text-right">0%</span>
                </div>
              </div>
              {/* Status */}
              <div className="w-28 flex items-center justify-end gap-1 pr-1">
                <StatusChip status={chipStatus} />
                <Icon name="chevR" className="w-4 h-4 text-zinc-300 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, icon, accent }: {
  label: string; value: number; sub: string; icon: string; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 shadow-card ${accent ? 'bg-ink text-paper ring-ink' : 'bg-white ring-zinc-200/80'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[12px] font-semibold uppercase tracking-wide whitespace-nowrap ${accent ? 'text-paper/60' : 'text-ink-mute'}`}>{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-accent text-ink' : 'bg-zinc-100 text-zinc-400'}`}>
          <Icon name={icon as any} className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 font-display font-bold text-[30px] leading-none tnum">{value}</div>
      <div className={`text-[12.5px] mt-1 ${accent ? 'text-paper/55' : 'text-ink-mute'}`}>{sub}</div>
    </div>
  )
}

const FORMAT_OPTIONS = [
  { value: 'americano',          label: 'Americano' },
  { value: 'mexicano',           label: 'Mexicano' },
  { value: 'round_robin',        label: 'Round Robin' },
  { value: 'knockout',           label: 'Knockout' },
  { value: 'king_of_the_court',  label: 'King of the Court' },
  { value: 'snakes_and_ladders', label: 'Snakes & Ladders' },
  { value: 'team_clash',         label: 'Team Clash' },
] as const

type TournamentFormat = typeof FORMAT_OPTIONS[number]['value']

function toDatetimeLocal(ms: number) {
  const d = new Date(ms)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function NewTournamentModal({ orgId, onClose, onCreated }: {
  orgId: Id<'organizations'>
  onClose: () => void
  onCreated: (id: Id<'tournaments'>) => void
}) {
  const venues = useQuery(api.venues.listByOrg, { organizationId: orgId })
  const createTournament = useMutation(api.tournaments.create)

  const now = Date.now()
  const [name, setName]       = useState('')
  const [format, setFormat]   = useState<TournamentFormat>('americano')
  const [venueId, setVenueId] = useState<Id<'venues'> | ''>('')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(now + 1000 * 60 * 60))
  const [endsAt, setEndsAt]     = useState(toDatetimeLocal(now + 1000 * 60 * 60 * 4))
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Pre-select first venue once loaded
  const firstVenueId = venues?.[0]?._id
  const resolvedVenue = (venueId || firstVenueId) as Id<'venues'> | undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedVenue) { setError('Select a venue'); return }
    if (!name.trim()) { setError('Name required'); return }
    setSaving(true)
    setError('')
    try {
      const id = await createTournament({
        organizationId: orgId,
        venueId: resolvedVenue,
        name: name.trim(),
        format,
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      })
      onCreated(id)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[480px] bg-paper rounded-2xl shadow-pop p-6 ring-1 ring-ink/8">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-[22px] tracking-tight">New tournament</h2>
            <p className="text-ink-mute text-[13px] mt-0.5">Create a draft — add players once created.</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-ink/6 text-ink-mute hover:text-ink transition-colors">
            <Icon name="x" className="w-4 h-4" stroke={2.5} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Name */}
          <Field label="Name">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Americano"
              className={INPUT_CLS}
              required
            />
          </Field>

          {/* Format */}
          <Field label="Format">
            <select
              value={format}
              onChange={e => setFormat(e.target.value as TournamentFormat)}
              className={INPUT_CLS}>
              {FORMAT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Field>

          {/* Venue */}
          <Field label="Venue">
            {venues === undefined ? (
              <div className={`${INPUT_CLS} text-ink-mute animate-pulse`}>Loading…</div>
            ) : venues.length === 0 ? (
              <div className={`${INPUT_CLS} text-red-500 text-sm`}>No venues — add one in Courts first.</div>
            ) : (
              <select
                value={venueId || firstVenueId}
                onChange={e => setVenueId(e.target.value as Id<'venues'>)}
                className={INPUT_CLS}>
                {venues.map(v => (
                  <option key={v._id} value={v._id}>{v.name} ({v.courtCount} courts)</option>
                ))}
              </select>
            )}
          </Field>

          {/* Date/time row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
            <Field label="Ends">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                className={INPUT_CLS}
                required
              />
            </Field>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Creating…' : 'Create tournament'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const INPUT_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-48 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[0,1,2].map(i => <div key={i} className="h-28 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="h-12 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
