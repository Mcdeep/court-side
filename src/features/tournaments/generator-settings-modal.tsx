import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { AppDialog } from '#/components/app-dialog'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { POINTS_TO_WIN } from '#/lib/constants'
import { useAsyncAction } from '#/hooks/use-async-action'
import type { Tournament } from './types'

export function GeneratorSettingsModal({ tournament, onClose }: {
  tournament: Tournament; onClose: () => void
}) {
  const [points, setPoints] = useState(String(tournament.pointsToWin ?? POINTS_TO_WIN))
  const { working, error, setError, run } = useAsyncAction()
  const updateTournament = useMutation(api.tournaments.update)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(points)
    if (!Number.isInteger(parsed) || parsed < 1) { setError('Enter a positive whole number'); return }
    await run(async () => {
      await updateTournament({ tournamentId: tournament._id, pointsToWin: parsed })
      onClose()
    })
  }

  return (
    <AppDialog open onOpenChange={o => !o && onClose()} title="Generator settings">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Points target">
          <Input
            autoFocus type="number" min={1} max={99}
            value={points}
            onChange={e => setPoints(e.target.value)}
          />
        </Field>
        <p className="text-[12.5px] text-ink-mute">
          First team to reach this score wins the match. Applies to new and edited scores.
        </p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={working}>
            {working ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
