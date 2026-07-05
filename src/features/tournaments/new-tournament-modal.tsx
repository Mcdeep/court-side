import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { toDatetimeLocal } from '#/lib/format'
import { useAsyncAction } from '#/hooks/use-async-action'

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

const INPUT_SELECT_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

export function NewTournamentModal({ orgId, onClose, onCreated }: {
  orgId: Id<'organizations'>
  onClose: () => void
  onCreated: (id: Id<'tournaments'>) => void
}) {
  const venues = useQuery(api.venues.listByOrg, { organizationId: orgId })
  const createTournament = useMutation(api.tournaments.create)
  const { working, error, setError, run } = useAsyncAction()

  const now = Date.now()
  const [name, setName]       = useState('')
  const [format, setFormat]   = useState<TournamentFormat>('americano')
  const [venueId, setVenueId] = useState<Id<'venues'> | ''>('')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(now + 1000 * 60 * 60))
  const [endsAt, setEndsAt]     = useState(toDatetimeLocal(now + 1000 * 60 * 60 * 4))
  const [roundMinutes, setRoundMinutes] = useState('')

  const firstVenueId = venues?.[0]?._id
  const resolvedVenue = (venueId || firstVenueId) as Id<'venues'> | undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedVenue) { setError('Select a venue'); return }
    if (!name.trim()) { setError('Name required'); return }
    await run(async () => {
      const id = await createTournament({
        organizationId: orgId,
        venueId: resolvedVenue,
        name: name.trim(),
        format,
        roundDurationMs: roundMinutes ? Number(roundMinutes) * 60_000 : undefined,
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      })
      onCreated(id)
    })
  }

  return (
    <AppDialog
      open
      onOpenChange={o => !o && onClose()}
      title="New tournament"
      description="Create a draft — add players once created."
      maxWidth="sm:max-w-[480px]"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Americano" required />
        </Field>
        <Field label="Format">
          <select value={format} onChange={e => setFormat(e.target.value as TournamentFormat)} className={INPUT_SELECT_CLS}>
            {FORMAT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Venue">
          {venues === undefined ? (
            <div className={`${INPUT_SELECT_CLS} text-ink-mute animate-pulse`}>Loading…</div>
          ) : venues.length === 0 ? (
            <div className={`${INPUT_SELECT_CLS} text-red-500 text-sm`}>No venues — add one in Courts first.</div>
          ) : (
            <select value={venueId || firstVenueId} onChange={e => setVenueId(e.target.value as Id<'venues'>)} className={INPUT_SELECT_CLS}>
              {venues.map(v => (
                <option key={v._id} value={v._id}>{v.name} ({v.courtCount} courts)</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Round duration (minutes)">
          <Input type="number" min={1} max={60} value={roundMinutes} onChange={e => setRoundMinutes(e.target.value)} placeholder="e.g. 4 (leave empty for no timer)" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts">
            <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required />
          </Field>
          <Field label="Ends">
            <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required />
          </Field>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={working}>
            {working ? 'Creating…' : 'Create tournament'}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
