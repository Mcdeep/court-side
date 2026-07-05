import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { toDatetimeLocal } from '#/lib/format'
import { useAsyncAction } from '#/hooks/use-async-action'
import type { Id, Tournament } from './types'

export function EditTournamentModal({ tournament, tournamentId, onClose }: {
  tournament: Tournament; tournamentId: Id<'tournaments'>; onClose: () => void
}) {
  const [name, setName] = useState(tournament.name)
  const [roundMinutes, setRoundMinutes] = useState(tournament.roundDurationMs ? String(tournament.roundDurationMs / 60_000) : '')
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(tournament.startsAt))
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(tournament.endsAt))
  const { working, error, setError, run } = useAsyncAction()
  const updateTournament = useMutation(api.tournaments.update)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name required'); return }
    await run(async () => {
      await updateTournament({
        tournamentId,
        name: name.trim(),
        roundDurationMs: roundMinutes ? Number(roundMinutes) * 60_000 : undefined,
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      })
      onClose()
    })
  }

  return (
    <AppDialog open onOpenChange={o => !o && onClose()} title="Edit tournament">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} required />
        </Field>
        <Field label="Round duration (minutes)">
          <Input type="number" min={1} max={60} value={roundMinutes} onChange={e => setRoundMinutes(e.target.value)} placeholder="Leave empty for no timer" />
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
            {working ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
