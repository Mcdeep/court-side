import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import { Avatar } from '#/components/ui/avatar'
import { Icon } from '#/components/ui/icon'

export const Route = createFileRoute('/$slug/rankings')({
  component: RankingsPage,
})

function RankingsPage() {
  const { slug } = useParams({ from: '/$slug/rankings' })
  const [editingTiers, setEditingTiers] = useState(false)

  const org = useQuery(api.organizations.getBySlug, { slug })
  const rankings = useQuery(
    api.ratings.getRankings,
    org ? { organizationId: org._id } : 'skip'
  )
  const tiers = useQuery(
    api.ratings.getTiers,
    org ? { organizationId: org._id } : 'skip'
  )

  if (org === undefined || rankings === undefined || tiers === undefined) return <PageSkeleton />
  if (org === null) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-ink-mute">Organisation not found.</p>
    </div>
  )

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 capitalize">{org.name}</div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Rankings</h1>
        </div>
        <button
          onClick={() => setEditingTiers(!editingTiers)}
          className="h-9 px-4 rounded-xl text-sm font-semibold bg-white ring-1 ring-zinc-200 hover:bg-zinc-50 transition-colors"
        >
          {editingTiers ? 'Close' : 'Point Tiers'}
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Stat label="Ranked Players" value={rankings.length} icon="users" />
        <Stat label="1st Place Pts" value={tiers[0] ?? 0} icon="trophy" />
        <Stat label="Tiers" value={tiers.length} icon="medal" />
      </div>

      {/* Tier editor */}
      {editingTiers && (
        <TierEditor organizationId={org._id} currentTiers={tiers} onClose={() => setEditingTiers(false)} />
      )}

      {/* Rankings table */}
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="font-semibold text-[15px]">
            All-time Rankings <span className="text-ink-mute font-normal">· {rankings.length}</span>
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="px-5 py-12 text-center text-ink-mute text-sm">
            No rankings yet. Complete a tournament to see player ratings.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[60px_auto_1fr_100px_100px] gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
              <div className="text-center">Rank</div>
              <div className="w-8" />
              <div>Player</div>
              <div className="text-right">Points</div>
              <div className="text-right">Played</div>
            </div>
            {rankings.map((r, i) => (
              <div key={r._id}
                className="grid grid-cols-[60px_auto_1fr_100px_100px] gap-4 px-5 py-3 items-center border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors">
                <div className="text-center">
                  <RankBadge rank={i + 1} />
                </div>
                <Avatar name={r.name} size={32} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{r.name}</div>
                  <div className="text-[12px] text-ink-mute truncate">{r.email}</div>
                </div>
                <div className="text-right">
                  <span className="tnum text-sm font-bold">{r.totalPoints}</span>
                </div>
                <div className="text-right">
                  <span className="tnum text-sm text-ink-mute">{r.tournamentsPlayed}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">1</span>
  if (rank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-600 font-bold text-xs">2</span>
  if (rank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">3</span>
  return <span className="tnum text-sm text-ink-mute font-semibold">{rank}</span>
}

function TierEditor({ organizationId, currentTiers, onClose }: {
  organizationId: any
  currentTiers: number[]
  onClose: () => void
}) {
  const [tiers, setTiers] = useState(currentTiers.join(', '))
  const [error, setError] = useState('')
  const setTiersMut = useMutation(api.ratings.setTiers)

  const handleSave = async () => {
    const parsed = tiers.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
    if (parsed.length === 0) {
      setError('Enter at least one number')
      return
    }
    if (parsed.some(n => n < 0)) {
      setError('Values must be non-negative')
      return
    }
    try {
      await setTiersMut({ organizationId, tiers: parsed })
      onClose()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-5 mb-7">
      <div className="font-semibold text-[15px] mb-3">Point Tiers</div>
      <p className="text-sm text-ink-mute mb-3">
        Comma-separated points by placement. 1st place first, then 2nd, etc.
      </p>
      <div className="flex gap-3 items-start">
        <input
          value={tiers}
          onChange={e => { setTiers(e.target.value); setError('') }}
          placeholder="10, 8, 6, 4, 3, 2"
          className="flex-1 h-9 px-3 rounded-xl bg-white ring-1 ring-zinc-200 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-dark/40"
        />
        <button
          onClick={handleSave}
          className="h-9 px-4 rounded-xl text-sm font-semibold bg-ink text-paper hover:bg-ink/90 transition-colors"
        >
          Save
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <div className="mt-3 flex gap-2 flex-wrap">
        {currentTiers.map((t, i) => (
          <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-100 text-xs font-semibold tnum">
            {ordinal(i + 1)}: {t}pts
          </span>
        ))}
      </div>
    </div>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
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
