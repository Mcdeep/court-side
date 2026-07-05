import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'

export function ParticipantsTab({ participants, tournamentId: _tid, canAdd, onAdd }: {
  participants: any[]; tournamentId: Id<'tournaments'>; canAdd: boolean; onAdd: () => void
}) {
  const removeParticipant = useMutation(api.participants.remove)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(participantId: Id<'participants'>) {
    setRemovingId(participantId)
    try { await removeParticipant({ participantId }) } finally { setRemovingId(null) }
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
        <div className="font-semibold text-[15px]">
          Participants <span className="text-ink-mute font-normal">· {participants.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon="filter">Sort</Button>
          {canAdd && (
            <Button variant="outline" size="sm" icon="plus" onClick={onAdd}>Add player</Button>
          )}
        </div>
      </div>
      {participants.length === 0 ? (
        <div className="px-5 py-12 text-center text-ink-mute text-sm">
          No participants yet. Add players to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {participants.map((p: any, i: number) => {
            const name = p.user?.name ?? p.walkInName ?? 'Walk-in'
            return (
              <div key={p._id}
                className={`group flex items-center gap-3 px-5 py-3
                  ${i % 2 === 0 ? 'border-r border-zinc-100' : ''}
                  border-b border-zinc-100`}>
                <span className="tnum text-[12px] text-zinc-300 w-5 font-mono">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Avatar name={name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{name}</div>
                  <div className="text-[12px] text-ink-mute">{p.isWalkIn ? 'Walk-in' : 'Member'}</div>
                </div>
                {canAdd ? (
                  <button
                    onClick={() => handleRemove(p._id)}
                    disabled={removingId === p._id}
                    title="Remove participant"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0 disabled:opacity-40">
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
