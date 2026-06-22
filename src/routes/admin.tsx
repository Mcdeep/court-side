import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useAuth, UserButton } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import React, { useEffect, useState } from 'react'
import { Icon } from '#/components/ui'
import type { Id } from '#/../convex/_generated/dataModel'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const [tab, setTab] = useState('orgs')
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
        <p className="text-muted-foreground text-sm">Super admin access required.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1000px] mx-auto px-10 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-display font-bold text-sm">C</span>
              <span className="font-display font-bold text-[17px] tracking-tight">CourtOS</span>
              <Badge variant="destructive" className="ml-1 text-[10px] font-bold uppercase">Admin</Badge>
            </div>
          </div>
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-10 py-8">
        <div className="grid grid-cols-4 gap-4 mb-7">
          <Stat label="Users" value={stats.users} icon="users" />
          <Stat label="Organisations" value={stats.organizations} icon="grid" />
          <Stat label="Tournaments" value={stats.tournaments} icon="trophy" />
          <Stat label="Active" value={stats.activeTournaments} icon="medal" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="orgs">Organisations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="orgs"><OrgsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
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
      <CreateOrgDialog open={showCreate} onOpenChange={setShowCreate} />

      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[24px] font-bold tracking-tight">Organisations</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Icon name="plus" className="w-4 h-4" stroke={2.4} />
          New org
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
                <Icon name="plus" className="w-4 h-4" stroke={2.4} />
                New org
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
              {orgs.map(org => <OrgRow key={org._id} org={org} />)}
            </TableBody>
          </Table>
        </Card>
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
                className={isSuspended
                  ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                  : 'text-destructive hover:bg-red-50'}
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

/* ─── Users Data Table ─── */

type UserRecord = { _id: Id<"users">; name: string; email: string; isSuperAdmin?: boolean }

function UserActions({ user }: { user: UserRecord }) {
  const [confirm, setConfirm] = useState<'promote' | 'demote' | null>(null)
  const [working, setWorking] = useState(false)
  const setSuperAdmin = useMutation(api.users.setSuperAdmin)
  const isSA = !!user.isSuperAdmin

  async function toggle() {
    setWorking(true)
    try {
      await setSuperAdmin({ userId: user._id, isSuperAdmin: !isSA })
      setConfirm(null)
    } catch {
      setConfirm(null)
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
            Copy email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={isSA ? 'text-destructive focus:text-destructive' : 'text-accent-dark focus:text-accent-dark'}
            onClick={() => setConfirm(isSA ? 'demote' : 'promote')}>
            {isSA ? 'Demote from admin' : 'Promote to admin'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'demote' ? 'Demote super admin?' : 'Promote to super admin?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'demote'
                ? `Remove super admin privileges from ${user.name}?`
                : `Grant super admin privileges to ${user.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm === 'demote' ? 'destructive' : 'default'}
              onClick={toggle}
              disabled={working}>
              {working ? '…' : confirm === 'demote' ? 'Demote' : 'Promote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const userColumns: ColumnDef<UserRecord>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-semibold">{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Email <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('email')}</span>,
  },
  {
    accessorKey: 'isSuperAdmin',
    header: 'Role',
    cell: ({ row }) => {
      const isSA = !!row.getValue('isSuperAdmin')
      return isSA ? (
        <Badge className="bg-accent-soft text-accent-dark border-accent-dark/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-dark" />
          Super Admin
        </Badge>
      ) : (
        <span className="text-[11px] text-muted-foreground font-semibold">User</span>
      )
    },
    filterFn: (row, _id, filterValue) => {
      if (filterValue === 'all') return true
      if (filterValue === 'admin') return !!row.original.isSuperAdmin
      return !row.original.isSuperAdmin
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <UserActions user={row.original} />,
  },
]

function UsersTab() {
  const users = useQuery(api.users.list)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data: (users ?? []) as UserRecord[],
    columns: userColumns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = (filterValue as string).toLowerCase()
      return row.original.name.toLowerCase().includes(q) ||
        row.original.email.toLowerCase().includes(q)
    },
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 10 } },
  })

  if (users === undefined) return <TabSkeleton />

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-[24px] font-bold tracking-tight">Users</h2>
        <div className="relative">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search users…"
            className="w-64 pl-9"
          />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="px-5">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="px-5 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={userColumns.length} className="px-5 py-8 text-center text-muted-foreground text-sm">
                  {globalFilter ? 'No users match.' : 'No users yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} user{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Create Org Dialog ─── */

function CreateOrgDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
      await adminCreateOrg({
        name: name.trim(),
        slug: slug.trim(),
        adminUserId: adminUserId ?? undefined,
      })
      resetAndClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create')
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
            <Input autoFocus value={name} onChange={handleNameChange}
              placeholder="e.g. City Padel Club" required />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={slug} onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
              placeholder="city-padel-club" required />
            <p className="text-[11px] text-muted-foreground">URL: /{slug || '…'}</p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Org admin <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create org'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Shared ─── */

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Card className="p-4 gap-2">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
            <Icon name={icon as any} className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 font-display font-bold text-[30px] leading-none tnum">{value}</div>
      </CardContent>
    </Card>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border" />
      <div className="max-w-[1000px] mx-auto px-10 py-8">
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}
