import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import { AppDialog } from '#/components/app-dialog'
import { Avatar } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useAsyncAction } from '#/hooks/use-async-action'
import { cleanErrorText } from '#/lib/utils'

export function LinkMemberModal({ memberId, memberName, linkedUserIds, onClose }: {
  memberId: Id<'members'>
  memberName: string
  linkedUserIds: Id<'users'>[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const { working, error, setError, run } = useAsyncAction()
  const allUsers = useQuery(api.users.list)
  const linkMember = useMutation(api.members.link)

  const filtered = (allUsers ?? [])
    .filter(u => !linkedUserIds.includes(u._id))
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  async function handleLink(userId: Id<'users'>) {
    setError('')
    await run(async () => {
      await linkMember({ memberId, userId })
      onClose()
    })
  }

  return (
    <AppDialog
      open
      onOpenChange={o => !o && onClose()}
      title={`Link "${memberName}" to an account`}
      description="Search across every signed-up account — the person doesn't need to have played here before."
    >
      <div className="space-y-3">
        <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" />
        {error && <p className="text-red-500 text-sm">{cleanErrorText(error)}</p>}
        <div className="max-h-64 overflow-y-auto -mx-1 space-y-0.5">
          {allUsers === undefined ? (
            <div className="text-center py-6 text-ink-mute text-sm animate-pulse">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-ink-mute text-sm">No accounts match.</div>
          ) : filtered.map(u => (
            <button key={u._id} onClick={() => handleLink(u._id)} disabled={working}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-zinc-50 text-left disabled:opacity-50">
              <Avatar name={u.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{u.name}</div>
                <div className="text-[12px] text-ink-mute">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
      </div>
    </AppDialog>
  )
}
