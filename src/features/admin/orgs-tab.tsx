import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Icon } from '#/components/ui/icon'
import { CreateOrgDialog } from './create-org-dialog'
import type { OrgWithStats } from './types'

export function OrgsTab() {
  const [showCreate, setShowCreate] = useState(false)
  const orgs = useQuery(api.organizations.listWithStats)

  if (orgs === undefined) return <TabSkeleton />

  return (
    <>
      <CreateOrgDialog open={showCreate} onOpenChange={setShowCreate} />
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[24px] font-bold tracking-tight">Organisations</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Icon name="plus" className="w-4 h-4" stroke={2.4} /> New org
        </Button>
      </div>
      {orgs.length === 0 ? (
        <Card className="p-14 flex flex-col items-center text-center">
          <CardContent className="flex flex-col items-center p-0">
            <span className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
              <Icon name="grid" className="w-8 h-8" stroke={1.8} />
            </span>
            <h3 className="font-display font-bold text-[20px]">No organisations</h3>
            <p className="text-muted-foreground text-sm mt-1">Create the first org to get started.</p>
            <div className="mt-5">
              <Button onClick={() => setShowCreate(true)}>
                <Icon name="plus" className="w-4 h-4" stroke={2.4} /> New org
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Organisation</TableHead>
                <TableHead className="px-5">Slug</TableHead>
                <TableHead className="px-5 text-center">Tournaments</TableHead>
                <TableHead className="px-5 text-center">Venues</TableHead>
                <TableHead className="px-5 text-center">Status</TableHead>
                <TableHead className="px-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org: OrgWithStats) => <OrgRow key={org._id} org={org} />)}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}

function OrgRow({ org }: { org: OrgWithStats }) {
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
      <TableRow>
        <TableCell className="px-5 py-3.5 font-semibold">{org.name}</TableCell>
        <TableCell className="px-5 py-3.5 font-mono text-[12px] text-muted-foreground">{org.slug}</TableCell>
        <TableCell className="px-5 py-3.5 text-center tnum">{org.tournamentCount}</TableCell>
        <TableCell className="px-5 py-3.5 text-center tnum">{org.venueCount}</TableCell>
        <TableCell className="px-5 py-3.5 text-center">
          <Badge variant={isSuspended ? 'destructive' : 'secondary'}
            className={isSuspended ? '' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-300' : 'bg-emerald-500'}`} />
            {isSuspended ? 'Suspended' : 'Active'}
          </Badge>
        </TableCell>
        <TableCell className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-destructive text-[11px]">{error}</span>}
            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setShowAssign(true)}>
              Assign admin
            </Button>
            <AlertDialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null) }}>
              <Button variant="ghost" size="sm"
                className={isSuspended ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700' : 'text-destructive hover:bg-red-50'}
                onClick={() => setConfirm(isSuspended ? 'activate' : 'suspend')}>
                {isSuspended ? 'Activate' : 'Suspend'}
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {confirm === 'suspend' ? 'Suspend organisation?' : 'Activate organisation?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirm === 'suspend'
                      ? `This will suspend "${org.name}". Members will lose access.`
                      : `This will reactivate "${org.name}".`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant={confirm === 'suspend' ? 'destructive' : 'default'}
                    onClick={handleAction}
                    disabled={working}>
                    {working ? '…' : confirm === 'suspend' ? 'Suspend' : 'Activate'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
      {showAssign && (
        <TableRow>
          <TableCell colSpan={6} className="px-5 py-3 bg-blue-50/50">
            <AssignAdminInline organizationId={org._id} onClose={() => setShowAssign(false)} />
          </TableCell>
        </TableRow>
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
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedUserId(null) }}
          placeholder="Search user by name or email…"
        />
        {search && !selectedUserId && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl ring-1 ring-border shadow-lg z-10 max-h-48 overflow-y-auto">
            {filtered.map(u => (
              <button key={u._id} onClick={() => { setSelectedUserId(u._id); setSearch(u.name) }}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2">
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground text-xs">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button size="sm" disabled={!selectedUserId || saving} onClick={handleAssign}>
        {saving ? 'Assigning…' : 'Assign'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      {error && <span className="text-destructive text-[11px]">{error}</span>}
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 bg-muted rounded-xl animate-pulse" />
      <div className="h-64 w-full rounded-2xl bg-muted animate-pulse" />
    </div>
  )
}
