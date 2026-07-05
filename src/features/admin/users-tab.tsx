import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
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
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon } from '#/components/ui/icon'

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
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>Copy email</DropdownMenuItem>
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
            <AlertDialogAction variant={confirm === 'demote' ? 'destructive' : 'default'} onClick={toggle} disabled={working}>
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
          <span className="w-1.5 h-1.5 rounded-full bg-accent-dark" /> Super Admin
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

export function UsersTab() {
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
      return row.original.name.toLowerCase().includes(q) || row.original.email.toLowerCase().includes(q)
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
          <Input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder="Search users…" className="w-64 pl-9" />
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
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
        </div>
      )}
    </>
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
