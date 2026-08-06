import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { Switch } from '#/components/ui/switch'
import { PRE_GENERATED_FORMATS } from '#/lib/constants'
import { errorMessage } from '#/lib/utils'
import type { Id, Participant, TournamentFormat } from './types'

export function ParticipantsTab({ participants, tournamentId, format, canAdd, onAdd }: {
  participants: Participant[]; tournamentId: Id<'tournaments'>; format: TournamentFormat
  canAdd: boolean; onAdd: () => void
}) {
  const removeParticipant = useMutation(api.participants.remove)
  const setSkillRating = useMutation(api.participants.setSkillRating)
  const setCheckedIn = useMutation(api.participants.setCheckedIn)
  const checkInAll = useMutation(api.participants.checkInAll)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [ratingInput, setRatingInput] = useState('')
  const [ratingError, setRatingError] = useState('')

  const showCheckIn = !PRE_GENERATED_FORMATS.includes(format)
  const checkedInCount = participants.filter(p => p.checkedIn === true).length

  async function handleRemove(participantId: Id<'participants'>) {
    setRemovingId(participantId)
    try { await removeParticipant({ participantId }) } finally { setRemovingId(null) }
  }

  function startEditRating(p: Participant) {
    setEditingId(p._id)
    setRatingInput(p.rating !== undefined ? String(p.rating) : '')
    setRatingError('')
  }

  async function saveRating(participantId: Id<'participants'>) {
    const value = Number(ratingInput)
    if (!ratingInput.trim() || isNaN(value) || value < 1 || value > 7) {
      setRatingError('1.0 – 7.0')
      return
    }
    try {
      await setSkillRating({ participantId, skillRating: value })
      setEditingId(null)
    } catch (e) {
      setRatingError(errorMessage(e))
    }
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-b border-zinc-100">
        <div className="font-semibold text-[15px]">
          Participants <span className="text-ink-mute font-normal">· {participants.length}</span>
          {showCheckIn && (
            <span className="text-ink-mute font-normal ml-2 text-[13px]">
              · {checkedInCount} checked in
            </span>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {showCheckIn && canAdd && (
            <Button variant="ghost" size="sm" icon="check" onClick={() => checkInAll({ tournamentId })}>
              Check in all
            </Button>
          )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {participants.map((p, i) => {
            const name = p.user?.name ?? p.walkInName ?? 'Walk-in'
            return (
              <div key={p._id}
                className={`group flex items-center gap-3 px-5 py-3
                  ${i % 2 === 0 ? 'sm:border-r border-zinc-100' : ''}
                  border-b border-zinc-100`}>
                <span className="tnum text-[12px] text-zinc-300 w-5 font-mono">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Avatar name={name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{name}</div>
                  <div className="text-[12px] text-ink-mute">{p.isWalkIn ? 'Walk-in' : 'Member'}</div>
                </div>
                {showCheckIn && (
                  <label className="flex items-center gap-1.5 shrink-0" title="Checked in">
                    <span className="text-[11px] font-semibold text-ink-mute hidden sm:inline">
                      {p.checkedIn ? 'In' : 'Absent'}
                    </span>
                    <Switch
                      checked={p.checkedIn === true}
                      onCheckedChange={checked => setCheckedIn({ participantId: p._id, checkedIn: checked })}
                    />
                  </label>
                )}
                {editingId === p._id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      autoFocus
                      value={ratingInput}
                      onChange={e => { setRatingInput(e.target.value); setRatingError('') }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRating(p._id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      placeholder="1–7"
                      className="w-14 h-7 px-2 rounded-lg bg-white ring-1 ring-zinc-200 text-xs tnum focus:outline-none focus:ring-2 focus:ring-accent-dark/40"
                    />
                    <button onClick={() => saveRating(p._id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-accent-dark hover:bg-accent-soft shrink-0">
                      <Icon name="check" className="w-4 h-4" />
                    </button>
                    {ratingError && <span className="text-[11px] text-red-500 whitespace-nowrap">{ratingError}</span>}
                  </div>
                ) : p.isWalkIn && canAdd ? (
                  <button
                    onClick={() => startEditRating(p)}
                    title="Set skill rating"
                    className="shrink-0 px-2 h-7 rounded-lg text-xs font-semibold tnum ring-1 ring-zinc-200 text-ink-mute hover:bg-zinc-50 transition-colors">
                    {p.rating !== undefined ? p.rating.toFixed(1) : 'Set rating'}
                  </button>
                ) : p.rating !== undefined ? (
                  <span className="shrink-0 px-2 h-7 flex items-center rounded-lg text-xs font-semibold tnum bg-zinc-100 text-ink-mute" title="Skill rating">
                    {p.rating.toFixed(1)}
                  </span>
                ) : null}
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
