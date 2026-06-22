import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useAuth, UserButton } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import React, { useEffect, useState } from 'react'
import { Button, Icon } from '#/components/ui'
import type { Id } from '#/../convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const [tab, setTab] = useState<'orgs' | 'users'>('orgs')
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const me = useQuery(api.users.me)
  const stats = useQuery(api.organizations.globalStats)

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate({ to: '/' })
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded || me === undefined || stats === undefined) return <PageSkeleton />
  if (!isSignedIn) return null

  if (!me?.isSuperAdmin) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="font-display text-[24px] font-bold mb-2">Access Denied</h1>
        <p className="text-ink-mute text-sm">Super admin access required.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-sm border-b border-zinc-200/80">
        <div className="max-w-[1000px] mx-auto px-10 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-ink text-paper flex items-center justify-center font-display font-bold text-sm">C</span>
              <span className="font-display font-bold text-[17px] tracking-tight">CourtOS</span>
              <span className="ml-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold uppercase">Admin</span>
            </div>
            <nav className="flex gap-1">
              {([['orgs', 'Organisations'], ['users', 'Users']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors
                    ${tab === id ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink hover:bg-zinc-100'}`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-10 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <Stat label="Users" value={stats.users} icon="users" />
          <Stat label="Organisations" value={stats.organizations} icon="grid" />
          <Stat label="Tournaments" value={stats.tournaments} icon="trophy" />
          <Stat label="Active" value={stats.activeTournaments} icon="medal" />
        </div>

        {tab === 'orgs' ? <OrgsTab /> : <UsersTab />}
      </div>
    </div>
  )
}

/* ─── Organisations Tab ─── */

function OrgsTab() {
  const [showCreate, setShowCreate] = useState(false)
  const orgs = useQuery(api.organizations.listWithStats)

  if (orgs === undefined) return <TabSkeleton />

  return (
    <>
      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[24px] font-bold tracking-tight">Organisations</h2>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setShowCreate(true)}>
          New org
        </Button>
      </div>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-14 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
            <Icon name="grid" className="w-8 h-8" stroke={1.8} />
          </span>
          <h3 className="font-display font-bold text-[20px]">No organisations</h3>
          <p className="text-ink-mute text-sm mt-1">Create the first org to get started.</p>
          <div className="mt-5">
            <Button variant="primary" size="lg" icon="plus" onClick={() => setShowCreate(true)}>New org</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Organisation</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Slug</th>
                <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Tournaments</th>
                <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Venues</th>
                <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {orgs.map(org => <OrgRow key={org._id} org={org} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function OrgRow({ org }: { org: any }) {
  const [confirm, setConfirm] = useState<'suspend' | 'activate' | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const suspend = useMutation(api.organizations.suspend)
  const activate = useMutation(api.organizations.activate)

  async function handleAction() {
    setWorking(true); setError('')
    try {
      if (confirm === 'suspend') await suspend({ organizationId: org._id })
      else if (confirm === 'activate') await activate({ organizationId: org._id })
      setConfirm(null)
    } catch (e: any) {
      setError(e?.message ?? 'Failed')
    } finally {
      setWorking(false)
    }
  }

  const isSuspended = org.status === 'suspended'

  return (
    <>
      <tr className="hover:bg-zinc-50/60 transition-colors">
        <td className="px-5 py-3.5 font-semibold">{org.name}</td>
        <td className="px-5 py-3.5 font-mono text-[12px] text-ink-mute">{org.slug}</td>
        <td className="px-5 py-3.5 text-center tnum">{org.tournamentCount}</td>
        <td className="px-5 py-3.5 text-center tnum">{org.venueCount}</td>
        <td className="px-5 py-3.5 text-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
            ${isSuspended ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-400' : 'bg-emerald-500'}`} />
            {isSuspended ? 'Suspended' : 'Active'}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-red-500 text-[11px]">{error}</span>}
            <Button size="sm" variant="ghost" className="!text-blue-600 hover:!bg-blue-50"
              onClick={() => setShowAssign(true)}>
              Assign admin
            </Button>
            {confirm ? (
              <>
                <button onClick={() => setConfirm(null)}
                  className="text-[12px] text-ink-mute hover:text-ink transition-colors">Cancel</button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={confirm === 'suspend' ? '!text-red-500 !ring-red-200 hover:!bg-red-50' : '!text-emerald-600 !ring-emerald-200 hover:!bg-emerald-50'}
                  onClick={handleAction}
                  disabled={working}>
                  {working ? '…' : confirm === 'suspend' ? 'Confirm suspend' : 'Confirm activate'}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className={isSuspended
                  ? '!text-emerald-600 hover:!bg-emerald-50'
                  : '!text-red-500 hover:!bg-red-50'}
                onClick={() => setConfirm(isSuspended ? 'activate' : 'suspend')}>
                {isSuspended ? 'Activate' : 'Suspend'}
              </Button>
            )}
          </div>
        </td>
      </tr>
      {showAssign && (
        <tr>
          <td colSpan={6} className="px-5 py-3 bg-blue-50/50">
            <AssignAdminInline organizationId={org._id} onClose={() => setShowAssign(false)} />
          </td>
        </tr>
      )}
    </>
  )
}

function AssignAdminInline({ organizationId, onClose }: { organizationId: Id<"organizations">; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const users = useQuery(api.users.list)
  const assignAdmin = useAction(api.clerkActions.assignOrgAdmin)

  const q = search.toLowerCase()
  const filtered = (users ?? []).filter(u =>
    !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  ).slice(0, 8)

  async function handleAssign() {
    if (!selectedUserId) return
    setSaving(true); setError('')
    try {
      await assignAdmin({ organizationId, userId: selectedUserId })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (e: any) {
      setError(e?.message ?? 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
      <Icon name="check" className="w-4 h-4" /> Admin assigned
    </div>
  )

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedUserId(null) }}
          placeholder="Search user by name or email…"
          className={INPUT_CLS + ' !h-9'}
        />
        {search && !selectedUserId && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl ring-1 ring-zinc-200 shadow-lg z-10 max-h-48 overflow-y-auto">
            {filtered.map(u => (
              <button key={u._id} onClick={() => { setSelectedUserId(u._id); setSearch(u.name) }}
                className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm flex items-center gap-2">
                <span className="font-medium">{u.name}</span>
                <span className="text-ink-mute text-xs">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button size="sm" variant="primary" disabled={!selectedUserId || saving} onClick={handleAssign}>
        {saving ? 'Assigning…' : 'Assign'}
      </Button>
      <button onClick={onClose} className="text-[12px] text-ink-mute hover:text-ink">Cancel</button>
      {error && <span className="text-red-500 text-[11px]">{error}</span>}
    </div>
  )
}

/* ─── Users Tab ─── */

function UsersTab() {
  const [search, setSearch] = useState('')
  const users = useQuery(api.users.list)

  if (users === undefined) return <TabSkeleton />

  const q = search.toLowerCase()
  const filtered = users.filter(u =>
    !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  )

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[24px] font-bold tracking-tight">Users</h2>
        <div className="relative">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="h-9 w-64 pl-9 pr-3 rounded-xl bg-white ring-1 ring-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-dark/40"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Name</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Email</th>
              <th className="text-center px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-mute">Role</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-mute text-sm">
                  {search ? 'No users match.' : 'No users yet.'}
                </td>
              </tr>
            ) : (
              filtered.map(user => <UserRow key={user._id} user={user} />)
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function UserRow({ user }: { user: any }) {
  const [confirm, setConfirm] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const setSuperAdmin = useMutation(api.users.setSuperAdmin)
  const isSA = !!user.isSuperAdmin

  async function toggle() {
    setWorking(true); setError('')
    try {
      await setSuperAdmin({ userId: user._id, isSuperAdmin: !isSA })
      setConfirm(false)
    } catch (e: any) {
      setError(e?.message ?? 'Failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <tr className="hover:bg-zinc-50/60 transition-colors">
      <td className="px-5 py-3.5 font-semibold">{user.name}</td>
      <td className="px-5 py-3.5 text-ink-mute">{user.email}</td>
      <td className="px-5 py-3.5 text-center">
        {isSA ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Super Admin
          </span>
        ) : (
          <span className="text-[11px] text-ink-mute font-semibold">User</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-2">
          {error && <span className="text-red-500 text-[11px]">{error}</span>}
          {confirm ? (
            <>
              <button onClick={() => setConfirm(false)}
                className="text-[12px] text-ink-mute hover:text-ink transition-colors">Cancel</button>
              <Button size="sm" variant="ghost"
                className={isSA ? '!text-red-500 !ring-red-200 hover:!bg-red-50' : '!text-violet-600 !ring-violet-200 hover:!bg-violet-50'}
                onClick={toggle} disabled={working}>
                {working ? '…' : isSA ? 'Confirm demote' : 'Confirm promote'}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost"
              className={isSA
                ? '!text-red-500 hover:!bg-red-50'
                : '!text-violet-600 hover:!bg-violet-50'}
              onClick={() => setConfirm(true)}>
              {isSA ? 'Demote' : 'Make admin'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ─── Shared ─── */

const INPUT_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [adminUserId, setAdminUserId] = useState<Id<"users"> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const adminCreateOrg = useAction(api.clerkActions.adminCreateOrg)
  const users = useQuery(api.users.list)

  const q = adminSearch.toLowerCase()
  const filteredUsers = (users ?? []).filter(u =>
    !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  ).slice(0, 8)

  function deriveSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setName(v)
    if (!slugTouched) setSlug(deriveSlug(v))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await adminCreateOrg({
        name: name.trim(),
        slug: slug.trim(),
        adminUserId: adminUserId ?? undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-paper rounded-2xl shadow-pop p-6 ring-1 ring-ink/8">
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display font-bold text-[22px] tracking-tight">New organisation</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-ink/6 text-ink-mute hover:text-ink transition-colors">
            <Icon name="x" className="w-4 h-4" stroke={2.5} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Name</label>
            <input autoFocus value={name} onChange={handleNameChange}
              placeholder="e.g. City Padel Club" className={INPUT_CLS} required />
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Slug</label>
            <input value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
              placeholder="city-padel-club" className={INPUT_CLS} required />
            <p className="text-[11px] text-ink-mute mt-1">URL: /{slug || '…'}</p>
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">
              Org admin <span className="normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                value={adminSearch}
                onChange={e => { setAdminSearch(e.target.value); setAdminUserId(null) }}
                placeholder="Search user by name or email…"
                className={INPUT_CLS}
              />
              {adminUserId && (
                <button type="button" onClick={() => { setAdminUserId(null); setAdminSearch('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink">
                  <Icon name="x" className="w-3.5 h-3.5" stroke={2.5} />
                </button>
              )}
              {adminSearch && !adminUserId && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl ring-1 ring-zinc-200 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button type="button" key={u._id}
                      onClick={() => { setAdminUserId(u._id as Id<"users">); setAdminSearch(u.name) }}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm flex items-center gap-2">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-ink-mute text-xs">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-ink-mute mt-1">
              {adminUserId ? 'User will be added as org member in Clerk' : 'You can assign an admin later'}
            </p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Creating…' : 'Create org'}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

function TabSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-zinc-100 rounded-xl mb-5" />
      <div className="h-64 bg-zinc-100 rounded-2xl" />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-paper animate-pulse">
      <div className="h-14 border-b border-zinc-200/80" />
      <div className="max-w-[1000px] mx-auto px-10 py-8">
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-zinc-100 rounded-2xl" />
      </div>
    </div>
  )
}
