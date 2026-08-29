import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { cleanConvexError, errorMessage } from '#/lib/utils'
import type { Id } from '#/../convex/_generated/dataModel'
import { AddMemberModal } from '#/features/players/add-member-modal'
import { ImportMembersModal } from '#/features/players/import-members-modal'
import { LinkMemberModal } from '#/features/players/link-member-modal'

export const Route = createFileRoute('/$slug/players')({
  component: PlayersPage,
})

function PlayersPage() {
  const { slug } = useParams({ from: '/$slug/players' })
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [linkingMember, setLinkingMember] = useState<{ id: Id<'members'>; name: string } | null>(null)
  const [removeError, setRemoveError] = useState<{ id: Id<'members'>; message: string } | null>(null)

  const org = useQuery(api.organizations.getBySlug, { slug })
  const roster = useQuery(api.members.listByOrg, org ? { organizationId: org._id } : 'skip')
  const data = useQuery(
    api.participants.listByOrg,
    org ? { organizationId: org._id } : 'skip'
  )
  const unlinkMember = useMutation(api.members.unlink)
  const removeMember = useMutation(api.members.remove)
  const setMemberRating = useMutation(api.members.setSkillRating)

  if (org === undefined || data === undefined || roster === undefined) return <PageSkeleton />
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
  const filteredRoster = roster.filter(m => !q || m.name.toLowerCase().includes(q))

  return (
    <div className="w-full px-10 py-8">
      {showAdd && <AddMemberModal organizationId={org._id} onClose={() => setShowAdd(false)} />}
      {showImport && (
        <ImportMembersModal
          organizationId={org._id}
          existingNames={roster.map(m => m.name)}
          onClose={() => setShowImport(false)}
        />
      )}
      {linkingMember && (
        <LinkMemberModal
          memberId={linkingMember.id}
          memberName={linkingMember.name}
          linkedUserIds={roster.map(m => m.userId).filter((id): id is Id<'users'> => id !== undefined)}
          onClose={() => setLinkingMember(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 capitalize">{org.name}</div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Players</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={() => setShowImport(true)}>Import list</Button>
          <Button variant="primary" size="md" icon="plus" onClick={() => setShowAdd(true)}>Add member</Button>
        </div>
      </div>

      {/* Roster */}
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="font-semibold text-[15px]">
            Roster <span className="text-ink-mute font-normal">· {filteredRoster.length}</span>
          </div>
        </div>
        {filteredRoster.length === 0 ? (
          <div className="px-5 py-12 text-center text-ink-mute text-sm">
            {search ? 'No roster members match.' : 'No members registered yet. Add or import your club’s regulars.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_100px_90px_auto] gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
              <div className="w-8" />
              <div>Name</div>
              <div className="text-right">Points</div>
              <div className="text-right">Rating</div>
              <div />
            </div>
            {filteredRoster.map(m => (
              <div key={m._id}
                className="grid grid-cols-[auto_1fr_100px_90px_auto] gap-4 px-5 py-3 items-center border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors">
                <Avatar name={m.name} size={32} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{m.name}</div>
                  <div className="text-[12px] text-ink-mute truncate">
                    {removeError?.id === m._id ? (
                      <span className="text-red-500">{removeError.message}</span>
                    ) : (
                      m.email ?? 'Not linked to an account'
                    )}
                  </div>
                </div>
                <div className="text-right tnum text-sm text-ink-mute">{m.startingPoints ?? '—'}</div>
                <div className="flex justify-end">
                  {m.userId ? (
                    <span className="text-[12px] text-ink-mute">via account</span>
                  ) : (
                    <MemberRatingEditor memberId={m._id} skillRating={m.skillRating}
                      onSave={(skillRating) => setMemberRating({ memberId: m._id, skillRating })} />
                  )}
                </div>
                <div className="flex justify-end gap-1">
                  {m.userId ? (
                    <Button variant="ghost" size="sm" onClick={() => unlinkMember({ memberId: m._id })}>Unlink</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setLinkingMember({ id: m._id, name: m.name })}>Link</Button>
                  )}
                  <Button variant="ghost" size="icon-sm" icon="trash"
                    onClick={async () => {
                      setRemoveError(null)
                      try {
                        await removeMember({ memberId: m._id })
                      } catch (e) {
                        setRemoveError({ id: m._id, message: cleanConvexError(e, 'Could not remove') })
                      }
                    }} />
                </div>
              </div>
            ))}
          </>
        )}
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

      {/* History — derived from past tournament participation */}
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="font-semibold text-[15px]">
            Played before <span className="text-ink-mute font-normal">· {filteredMembers.length}</span>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="px-5 py-12 text-center text-ink-mute text-sm">
            {search ? 'No members match.' : 'No history yet. Players appear here after joining a tournament.'}
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

function MemberRatingEditor({ skillRating, onSave }: {
  memberId: Id<'members'>
  skillRating: number | undefined
  onSave: (skillRating: number) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(skillRating !== undefined ? String(skillRating) : '')
  const [error, setError] = useState('')

  async function save() {
    const parsed = Number(value)
    if (!value.trim() || isNaN(parsed) || parsed < 1 || parsed > 7) {
      setError('1.0 – 7.0')
      return
    }
    try {
      await onSave(parsed)
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
    <div className="w-full px-10 py-8 animate-pulse">
      <div className="h-9 w-32 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[0, 1, 2].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
