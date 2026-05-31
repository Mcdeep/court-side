import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import React, { useState } from 'react'
import { Button, Icon } from '#/components/ui'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const [showCreate, setShowCreate] = useState(false)
  const orgs = useQuery(api.organizations.listWithStats)

  if (orgs === undefined) return <PageSkeleton />

  const totalTournaments = orgs.reduce((s, o) => s + o.tournamentCount, 0)
  const totalCourts = orgs.reduce((s, o) => s + o.courtCount, 0)

  return (
    <div className="max-w-[1000px] mx-auto px-10 py-8">
      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2">System</div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Super Admin</h1>
        </div>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setShowCreate(true)}>
          New org
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Stat label="Organisations" value={orgs.length}       icon="grid" />
        <Stat label="Tournaments"   value={totalTournaments}  icon="trophy" />
        <Stat label="Total courts"  value={totalCourts}       icon="court" />
      </div>

      {/* Org table */}
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
    </div>
  )
}

function OrgRow({ org }: { org: any }) {
  const [confirm, setConfirm] = useState<'suspend' | 'activate' | null>(null)
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
  )
}

const INPUT_CLS = 'w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all'

function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const adminCreate = useMutation(api.organizations.adminCreate)

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
      await adminCreate({ name: name.trim(), slug: slug.trim() })
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
            <input
              autoFocus
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. City Padel Club"
              className={INPUT_CLS}
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-mute mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
              placeholder="city-padel-club"
              className={INPUT_CLS}
              required
            />
            <p className="text-[11px] text-ink-mute mt-1">URL: /org/{slug || '…'}</p>
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

function PageSkeleton() {
  return (
    <div className="max-w-[1000px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-40 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[0, 1, 2].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
