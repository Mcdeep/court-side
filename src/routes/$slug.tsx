import { createFileRoute, Link, Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useAuth, UserButton } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import { Icon } from '#/components/ui/icon'
import { useEffect } from 'react'

export const Route = createFileRoute('/$slug')({
  component: OrgShell,
})

const NAV = [
  { id: 'tournaments', label: 'Tournaments', icon: 'trophy' as const, badge: null },
  { id: 'rankings',    label: 'Rankings',    icon: 'medal'  as const, badge: null },
  { id: 'players',     label: 'Players',     icon: 'users'  as const, badge: null },
  { id: 'courts',      label: 'Courts',      icon: 'court'  as const, badge: null },
  { id: 'settings',    label: 'Settings',    icon: 'gear'   as const, badge: null },
]

function OrgShell() {
  const { slug } = useParams({ from: '/$slug' })
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const active = NAV.find(n => pathname.includes(`/${n.id}`))?.id ?? 'tournaments'
  const isWizard = pathname.endsWith('/tournaments/new')

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/' })
    }
  }, [isLoaded, isSignedIn, navigate])

  const org = useQuery(api.organizations.getBySlug, { slug })
  const me = useQuery(api.users.me)
  const tournaments = useQuery(
    api.tournaments.list,
    org ? { organizationId: org._id } : 'skip'
  )
  const tournamentCount = tournaments?.length ?? 0

  if (!isLoaded) return <ShellSkeleton />
  if (!isSignedIn) return null

  if (org === undefined || me === undefined) return <ShellSkeleton />
  if (org === null) return (
    <div className="flex items-center justify-center h-screen bg-paper">
      <div className="text-center">
        <h1 className="font-display text-[24px] font-bold mb-2">Organisation not found</h1>
        <p className="text-ink-mute text-sm mb-4">No organisation with slug "{slug}".</p>
        <button onClick={() => navigate({ to: '/' })}
          className="px-4 py-2 bg-ink text-paper rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors">
          Go home
        </button>
      </div>
    </div>
  )

  if (isWizard) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-screen bg-paper font-sans text-ink">
      <Sidebar slug={slug} active={active} tournamentCount={tournamentCount} isSuperAdmin={!!me?.isSuperAdmin} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function Sidebar({ slug, active, tournamentCount, isSuperAdmin }: { slug: string; active: string; tournamentCount: number; isSuperAdmin: boolean }) {
  return (
    <aside className="w-[244px] shrink-0 bg-ink text-paper flex flex-col h-screen sticky top-0">
      {/* Wordmark */}
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/5">
        <span className="w-9 h-9 rounded-xl bg-accent text-ink flex items-center justify-center font-display font-bold text-lg">C</span>
        <span className="font-display font-bold text-[19px] tracking-tight">CourtOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 pt-3 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-paper/35">Manage</div>
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <Link key={item.id} to={`/${slug}/${item.id}` as any}
              className={`w-full flex items-center gap-3 h-10 px-3 rounded-xl text-[14px] font-semibold transition-all relative
                ${isActive ? 'bg-white/10 text-paper' : 'text-paper/55 hover:text-paper hover:bg-white/5'}`}>
              {isActive && <span className="absolute left-0 w-1 h-5 rounded-r-full bg-accent" />}
              <Icon name={item.icon} className="w-[18px] h-[18px]" stroke={2.2} />
              {item.label}
              {item.id === 'tournaments' && tournamentCount > 0 && (
                <span className="ml-auto text-[11px] tnum font-bold bg-accent text-ink px-1.5 rounded-full">{tournamentCount}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Super admin link + Org footer */}
      <div className="p-3 border-t border-white/5">
        {isSuperAdmin && (
          <Link to="/admin"
            className="flex items-center gap-3 h-10 px-3 mb-2 rounded-xl text-[14px] font-semibold text-red-400 hover:bg-white/5 transition-all">
            <Icon name="bolt" className="w-[18px] h-[18px]" stroke={2.2} />
            Admin
          </Link>
        )}
        <div className="flex items-center gap-3 p-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9',
              },
            }}
          />
          <div className="text-left min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate capitalize">{slug.replace(/-/g, ' ')}</div>
            <div className="text-[11px] text-paper/45">Organiser</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-paper animate-pulse">
      <div className="w-[244px] bg-ink" />
      <div className="flex-1 p-10">
        <div className="h-9 w-40 bg-zinc-100 rounded-xl mb-7" />
        <div className="h-64 bg-zinc-100 rounded-2xl" />
      </div>
    </div>
  )
}
