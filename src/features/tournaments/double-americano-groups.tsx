import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useAsyncAction } from '#/hooks/use-async-action'
import { participantName } from '#/lib/names'
import type { Id, Participant, Tournament } from './types'

type SplitMode = NonNullable<Tournament['groupSplitMode']>

export function DoubleAmericanoGroups({ tournamentId, participants, mode, canEdit }: {
  tournamentId: Id<'tournaments'>
  participants: Participant[]
  mode?: SplitMode
  canEdit: boolean
}) {
  const [selectedMode, setSelectedMode] = useState<SplitMode>(mode ?? 'random')
  const [swapFrom, setSwapFrom] = useState<Id<'participants'>>()
  const assignGroups = useMutation(api.participants.assignGroups)
  const swapGroups = useMutation(api.participants.swapGroups)
  const { working, error, run } = useAsyncAction()
  const assigned = participants.filter(player => player.group !== undefined)
  const missingRatings = participants.filter(player => player.rating === undefined).length

  async function assign() {
    const assignedGroups = await run(() => assignGroups({ tournamentId, mode: selectedMode }))
    if (assignedGroups) setSwapFrom(undefined)
  }

  async function selectSwap(player: Participant) {
    if (!swapFrom) { setSwapFrom(player._id); return }
    const first = participants.find(candidate => candidate._id === swapFrom)
    if (!first || first.group === player.group) { setSwapFrom(player._id); return }
    const swapped = await run(() => swapGroups({ tournamentId, participantAId: first._id, participantBId: player._id }))
    if (swapped) setSwapFrom(undefined)
  }

  return (
    <section className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="font-display font-bold text-[18px]">Double Americano groups</h3>
        <p className="text-sm text-ink-mute mt-1">Two groups of eight play seven partnership rounds, followed by crossover finals.</p>
        {canEdit && <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <ToggleGroup type="single" value={selectedMode} onValueChange={value => value && setSelectedMode(value as SplitMode)} className="justify-start">
            <ToggleGroupItem value="random">Random</ToggleGroupItem>
            <ToggleGroupItem value="top_bottom">Top / bottom</ToggleGroupItem>
            <ToggleGroupItem value="balanced">Balanced</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-ink-mute">{selectedMode === 'random' ? 'Shuffles all players; ratings are optional.' : selectedMode === 'top_bottom' ? 'Puts the strongest eight together and the remaining eight together.' : 'Finds the closest possible equal total skill rating between groups.'}</p>
          <Button variant="primary" onClick={assign} disabled={working || participants.length !== 16 || (selectedMode !== 'random' && missingRatings > 0)}>
            {assigned.length === 16 ? 'Reassign groups' : 'Assign groups'}
          </Button>
          {selectedMode !== 'random' && missingRatings > 0 && <p className="text-sm text-red-500">Set ratings for all 16 players below first ({missingRatings} missing).</p>}
        </div>}
        {canEdit && <p className="text-xs text-ink-mute mt-3">{selectedMode === 'balanced' ? 'Balances total skill ratings as closely as possible between two groups of eight.' : selectedMode === 'top_bottom' ? 'Group 1 contains the eight highest-rated players; Group 2 contains the remaining eight.' : 'Shuffles everyone into two groups of eight. Ratings are optional.'}</p>}
        {error && <p role="alert" className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
      {assigned.length === 0 ? <p className="p-5 text-sm text-ink-mute">Groups have not been assigned yet.</p> : (
        <div className="grid md:grid-cols-2 gap-px bg-zinc-100">
          {([1, 2] as const).map(group => {
            const players = participants.filter(player => player.group === group)
            const total = players.reduce((sum, player) => sum + (player.rating ?? 0), 0)
            const rated = players.filter(player => player.rating !== undefined).length
            return <div key={group} className="bg-white p-5">
              <div className="flex items-center justify-between mb-3"><h4 className="font-bold">Group {group}</h4><span className="text-xs text-ink-mute">Rated {rated}/{players.length} · Total {rated ? total.toFixed(2) : '—'} · Mean {rated ? (total / rated).toFixed(2) : '—'}</span></div>
              <div className="space-y-1.5">{players.map(player => <button key={player._id} type="button" disabled={!canEdit || working} onClick={() => selectSwap(player)} className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left ring-1 ${swapFrom === player._id ? 'bg-accent-soft ring-accent-dark/40' : 'bg-zinc-50 ring-zinc-200'}`}>
                <Avatar name={participantName(player)} size={28} /><span className="flex-1 truncate text-sm font-semibold">{participantName(player)}</span><span className="text-xs text-ink-mute tnum">Rating {player.rating?.toFixed(2) ?? '—'}</span>
              </button>)}</div>
            </div>
          })}
        </div>
      )}
      {canEdit && assigned.length === 16 && <p className="px-5 py-3 border-t border-zinc-100 text-xs text-ink-mute">Select one player, then a player in the other group to swap them.</p>}
    </section>
  )
}
