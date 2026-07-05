import React, { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Icon } from '#/components/ui/icon'
import { errorMessage } from '#/lib/utils'

export function CreateOrgDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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

  function resetAndClose() {
    setName(''); setSlug(''); setSlugTouched(false)
    setAdminSearch(''); setAdminUserId(null)
    setError(''); setSaving(false)
    onOpenChange(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await adminCreateOrg({ name: name.trim(), slug: slug.trim(), adminUserId: adminUserId ?? undefined })
      resetAndClose()
    } catch (err) {
      setError(errorMessage(err, 'Failed to create'))
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold tracking-tight">New organisation</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input autoFocus value={name} onChange={handleNameChange} placeholder="e.g. City Padel Club" required />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="city-padel-club" required />
            <p className="text-[11px] text-muted-foreground">URL: /{slug || '…'}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Org admin <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <Input
                value={adminSearch}
                onChange={e => { setAdminSearch(e.target.value); setAdminUserId(null) }}
                placeholder="Search user by name or email…"
              />
              {adminUserId && (
                <button type="button" onClick={() => { setAdminUserId(null); setAdminSearch('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Icon name="x" className="w-3.5 h-3.5" stroke={2.5} />
                </button>
              )}
              {adminSearch && !adminUserId && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl ring-1 ring-border shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button type="button" key={u._id}
                      onClick={() => { setAdminUserId(u._id as Id<"users">); setAdminSearch(u.name) }}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground text-xs">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {adminUserId ? 'User will be added as org member in Clerk' : 'You can assign an admin later'}
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create org'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
