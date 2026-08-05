import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import { Avatar } from '#/components/ui/avatar'
import { Icon } from '#/components/ui/icon'
import { errorMessage } from '#/lib/utils'
import type { Id } from '#/../convex/_generated/dataModel'

export const Route = createFileRoute('/$slug/players')({
  component: PlayersPage,
})

function PlayersPage() {
  const { slug } = useParams({ from: '/$slug/players' })
  const [search, setSearch] = useState('')

  const org = useQuery(api.organizations.getBySlug, { slug })
  const data = useQuery(
    api.participants.listByOrg,
    org ? { organizationId: org._id } : 'skip'
  )

  if (org === undefined || data === undefined) return <PageSkeleton />
  if (org === null) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-ink-mute">Organisation not found.</p>
    </div>
  )

  const { members, walkIns } = data
  const q = search.toLowerCase()
  const filteredMembers = members.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  )
  const filteredWalkIns = walkIns.filter(w => !q || w.name.toLowerCase().includes(q))

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 capitalize">{org.name}</div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Players</h1>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Stat label="Members"  value={members.length}  icon="users"  />
        <Stat label="Walk-ins" value={walkIns.length}   icon="medal"  />
        <Stat label="Total"    value={members.length + walkIns.length} icon="trophy" />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players…"
          className="h-9 w-72 pl-9 pr-3 rounded-xl bg-white ring-1 ring-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-dark/40"
        />
      </div>

      {/* Members table */}
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="font-semibold text-[15px]">
            Members <span className="text-ink-mute font-normal">· {filteredMembers.length}</span>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="px-5 py-12 text-center text-ink-mute text-sm">
            {search ? 'No members match.' : 'No members yet. Players appear here after joining a tournament.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_1fr_90px_80px] gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
              <div className="w-8" />
              <div>Name</div>
              <div>Email</div>
              <div className="text-right">Rating</div>
              <div className="text-right">Tournaments</div>
            </div>
            {filteredMembers.map((m) => (
              <div key={m._id}
                className="grid grid-cols-[auto_1fr_1fr_90px_80px] gap-4 px-5 py-3 items-center border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors">
                <Avatar name={m.name} size={32} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{m.name}</div>
                </div>
                <div className="text-sm text-ink-mute truncate">{m.email}</div>
                <div className="flex justify-end">
                  <RatingEditor organizationId={org._id} userId={m._id} skillRating={m.skillRating} />
                </div>
                <div className="text-right">
                  <span className="tnum text-sm font-semibold">{m.tournamentCount}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Walk-ins section */}
      {(filteredWalkIns.length > 0 || (search && walkIns.length > 0)) && (
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
            <div className="font-semibold text-[15px]">
              Walk-ins <span className="text-ink-mute font-normal">· {filteredWalkIns.length}</span>
            </div>
          </div>
          {filteredWalkIns.length === 0 ? (
            <div className="px-5 py-8 text-center text-ink-mute text-sm">No walk-ins match.</div>
          ) : (
            <div className="grid grid-cols-2">
              {filteredWalkIns.map((w, i) => (
                <div key={w.name}
                  className={`flex items-center gap-3 px-5 py-3
                    ${i % 2 === 0 ? 'border-r border-zinc-100' : ''}
                    border-b border-zinc-100 last:border-b-0`}>
                  <Avatar name={w.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{w.name}</div>
                    <div className="text-[12px] text-ink-mute">Walk-in · {w.count} tournament{w.count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RatingEditor({ organizationId, userId, skillRating }: {
  organizationId: Id<'organizations'>
  userId: Id<'users'>
  skillRating: number | undefined
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(skillRating !== undefined ? String(skillRating) : '')
  const [error, setError] = useState('')
  const setSkillRating = useMutation(api.ratings.setSkillRating)

  async function save() {
    const parsed = Number(value)
    if (!value.trim() || isNaN(parsed) || parsed < 1 || parsed > 7) {
      setError('1.0 – 7.0')
      return
    }
    try {
      await setSkillRating({ organizationId, userId, skillRating: parsed })
      setEditing(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          onKeyDown={e => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder="1–7"
          className="w-14 h-7 px-2 rounded-lg bg-white ring-1 ring-zinc-200 text-xs tnum focus:outline-none focus:ring-2 focus:ring-accent-dark/40"
        />
        <button onClick={save} className="w-7 h-7 rounded-lg flex items-center justify-center text-accent-dark hover:bg-accent-soft shrink-0">
          <Icon name="check" className="w-4 h-4" />
        </button>
        {error && <span className="text-[11px] text-red-500 whitespace-nowrap">{error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => { setValue(skillRating !== undefined ? String(skillRating) : ''); setEditing(true) }}
      title="Set skill rating (e.g. from Playtomic)"
      className="px-2 h-7 rounded-lg text-xs font-semibold tnum ring-1 ring-zinc-200 text-ink-mute hover:bg-zinc-50 transition-colors">
      {skillRating !== undefined ? skillRating.toFixed(1) : 'Set'}
    </button>
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
    <div className="max-w-[1100px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-32 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[0, 1, 2].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
