import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useAuth, UserButton } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import { Icon } from '#/components/ui/icon'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const [tab, setTab] = useState<'tournaments' | 'rankings'>('tournaments')
  const me = useQuery(api.users.me)

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate({ to: '/' })
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded) return <DashSkeleton />
  if (!isSignedIn) return null

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <TopNav tab={tab} onTab={setTab} isSuperAdmin={!!me?.isSuperAdmin} />
      <main className="max-w-[900px] mx-auto px-8 py-8">
        {tab === 'tournaments' ? <TournamentsTab /> : <RankingsTab />}
      </main>
    </div>
  )
}

function TopNav({ tab, onTab, isSuperAdmin }: { tab: string; onTab: (t: any) => void; isSuperAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-sm border-b border-zinc-200/80">
      <div className="max-w-[900px] mx-auto px-8 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-ink text-paper flex items-center justify-center font-display font-bold text-sm">C</span>
            <span className="font-display font-bold text-[17px] tracking-tight">CourtOS</span>
          </Link>
          <nav className="flex gap-1">
            {(['tournaments', 'rankings'] as const).map(t => (
              <button key={t} onClick={() => onTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors
                  ${tab === t ? 'bg-ink text-paper' : 'text-ink-mute hover:text-ink hover:bg-zinc-100'}`}>
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Link to="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
              <Icon name="bolt" className="w-4 h-4" />
              Admin
            </Link>
          )}
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </div>
      </div>
    </header>
  )
}

function TournamentsTab() {
  const tournaments = useQuery(api.tournaments.listMyTournaments)

  if (tournaments === undefined) return <TabSkeleton />

  if (tournaments.length === 0) return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-12 text-center">
      <Icon name="trophy" className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
      <h3 className="font-display font-bold text-[18px] mb-1">No tournaments yet</h3>
      <p className="text-ink-mute text-sm">Tournaments you're part of will appear here.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <h2 className="font-display text-[24px] font-bold tracking-tight">Tournaments</h2>
      {tournaments.map(t => (
        <Link key={t._id} to={`/${t.orgSlug}/tournaments/${t._id}` as any}
          className="flex items-center gap-4 p-4 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card hover:ring-zinc-300 transition-all">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Icon name="trophy" className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]">{t.name}</div>
            <div className="flex items-center gap-2 text-[12px] text-ink-mute">
              <span>{t.clubName}</span>
              <span>·</span>
              <span className="capitalize">{t.format.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>{new Date(t.startsAt).toLocaleDateString()}</span>
            </div>
          </div>
          <TournamentState state={t.state} />
          <Icon name="chevR" className="w-5 h-5 text-zinc-300" />
        </Link>
      ))}
    </div>
  )
}

function TournamentState({ state }: { state: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-500',
    published: 'bg-blue-50 text-blue-600',
    registration_open: 'bg-violet-50 text-violet-600',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-zinc-100 text-zinc-400',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${colors[state] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {state.replace(/_/g, ' ')}
    </span>
  )
}

function RankingsTab() {
  const rankings = useQuery(api.ratings.getMyRankings)

  if (rankings === undefined) return <TabSkeleton />

  if (rankings.length === 0) return (
    <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-12 text-center">
      <Icon name="medal" className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
      <h3 className="font-display font-bold text-[18px] mb-1">No rankings yet</h3>
      <p className="text-ink-mute text-sm">Complete a tournament to earn rating points.</p>
    </div>
  )

  return (
    <div>
      <h2 className="font-display text-[24px] font-bold tracking-tight mb-5">Your Rankings</h2>
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px] gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
          <div>Club</div>
          <div className="text-right">Points</div>
          <div className="text-right">Played</div>
        </div>
        {rankings.map(r => (
          <div key={r._id}
            className="grid grid-cols-[1fr_100px_100px] gap-4 px-5 py-3.5 items-center border-b border-zinc-100 last:border-0">
            <div className="font-semibold text-sm">{r.clubName}</div>
            <div className="text-right tnum text-sm font-bold">{r.totalPoints}</div>
            <div className="text-right tnum text-sm text-ink-mute">{r.tournamentsPlayed}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-40 bg-zinc-100 rounded-xl" />
      <div className="h-20 bg-zinc-100 rounded-2xl" />
      <div className="h-20 bg-zinc-100 rounded-2xl" />
    </div>
  )
}

function DashSkeleton() {
  return (
    <div className="min-h-screen bg-paper animate-pulse">
      <div className="h-14 border-b border-zinc-200/80" />
      <div className="max-w-[900px] mx-auto px-8 py-8 space-y-3">
        <div className="h-8 w-40 bg-zinc-100 rounded-xl" />
        <div className="h-20 bg-zinc-100 rounded-2xl" />
        <div className="h-20 bg-zinc-100 rounded-2xl" />
      </div>
    </div>
  )
}
