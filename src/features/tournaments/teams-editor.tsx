import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { useAsyncAction } from '#/hooks/use-async-action'
import type { Id, Participant } from './types'

type Slot = Participant | null

export function TeamsEditor({ participants, tournamentId, locked, canEdit }: {
  participants: Participant[]; tournamentId: Id<'tournaments'>; locked: boolean; canEdit: boolean
}) {
  const teams = useQuery(api.teams.listByTournament, { tournamentId })
  const setPairsMutation = useMutation(api.teams.setPairs)
  const { working, error, run } = useAsyncAction()

  const [slots, setSlots] = useState<Slot[][] | null>(null)
  const [selected, setSelected] = useState<[number, number] | null>(null)

  const byId = useMemo(() => new Map(participants.map(p => [p._id, p])), [participants])

  useEffect(() => {
    if (!teams) return
    const teamCount = Math.max(teams.length, Math.ceil(participants.length / 2))
    const next: Slot[][] = Array.from({ length: teamCount }, () => [null, null])
    teams.forEach((team, i) => {
      team.members.forEach((m, slot) => {
        if (slot < 2) next[i][slot] = byId.get(m._id) ?? null
      })
    })
    const placed = new Set(next.flat().filter((p): p is Participant => !!p).map(p => p._id))
    let cursor = 0
    for (const p of participants) {
      if (placed.has(p._id)) continue
      while (cursor < next.length && next[cursor][0] && next[cursor][1]) cursor++
      if (cursor >= next.length) next.push([null, null])
      if (!next[cursor][0]) next[cursor][0] = p
      else next[cursor][1] = p
    }
    setSlots(next)
    // Only re-derive from server/roster changes, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, participants.length])

  if (!teams || !slots) return null

  function pick(teamIdx: number, slotIdx: number) {
    if (locked || !canEdit) return
    if (!selected) {
      if (slots![teamIdx][slotIdx]) setSelected([teamIdx, slotIdx])
      return
    }
    const [ti, si] = selected
    setSlots(prev => {
      if (!prev) return prev
      const next = prev.map(t => [...t] as Slot[])
      const tmp = next[teamIdx][slotIdx]
      next[teamIdx][slotIdx] = next[ti][si]
      next[ti][si] = tmp
      return next
    })
    setSelected(null)
  }

  async function save() {
    if (!slots) return
    const pairs = slots
      .filter((team): team is [Participant, Participant] => !!team[0] && !!team[1])
      .map(team => [team[0]._id, team[1]._id])
    await run(async () => {
      await setPairsMutation({ tournamentId, pairs })
    })
  }

  const pairCount = slots.filter(([a, b]) => a && b).length

  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-b border-zinc-100">
        <div className="font-semibold text-[15px]">
          Teams <span className="text-ink-mute font-normal">· {pairCount} pairs</span>
        </div>
        {locked ? (
          <span className="text-[12.5px] text-ink-mute font-medium flex items-center gap-1">
            <Icon name="clock" className="w-3.5 h-3.5" /> Reset the schedule to edit pairing
          </span>
        ) : canEdit ? (
          <Button variant="primary" size="sm" icon="check" onClick={save} disabled={working}>
            {working ? 'Saving…' : 'Save pairing'}
          </Button>
        ) : null}
      </div>
      {error && <p className="px-5 pt-3 text-[12.5px] text-red-500">{error}</p>}
      {!locked && canEdit && (
        <p className="px-5 pt-3 text-[12.5px] text-ink-mute">Tap a player, then tap another to swap them between teams.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
        {slots.map((team, ti) => (
          <div key={ti} className="rounded-xl ring-1 ring-zinc-200 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Team {ti + 1}</div>
            <div className="space-y-1.5">
              {[0, 1].map(si => {
                const p = team[si]
                const isSelected = selected?.[0] === ti && selected?.[1] === si
                return (
                  <button
                    key={si}
                    type="button"
                    onClick={() => pick(ti, si)}
                    disabled={locked || !canEdit || (!p && !selected)}
                    className={`w-full flex items-center gap-2 h-9 px-2 rounded-lg text-left transition-colors disabled:cursor-default
                      ${isSelected ? 'bg-accent-soft ring-1 ring-accent-dark/40' :
                        p ? 'bg-zinc-50 hover:bg-zinc-100' : 'ring-1 ring-dashed ring-zinc-200 text-zinc-300'}`}>
                    {p ? (
                      <>
                        <Avatar name={p.user?.name ?? p.walkInName ?? 'Walk-in'} size={22} />
                        <span className="text-[13px] font-medium truncate">{p.user?.name ?? p.walkInName}</span>
                      </>
                    ) : (
                      <span className="text-[12.5px]">Empty</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
