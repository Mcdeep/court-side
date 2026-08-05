import { createFileRoute, Link, Outlet, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useAuth, UserButton } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import { Icon } from '#/components/ui/icon'
import { useEffect } from 'react'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '#/components/ui/sidebar'

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
    <SidebarProvider defaultOpen={false} className="bg-paper font-sans text-ink">
      <Sidebar slug={slug} active={active} tournamentCount={tournamentCount} isSuperAdmin={!!me?.isSuperAdmin} />
      <SidebarInset className="bg-paper">
        <div className="h-12 flex items-center gap-2 px-3 md:hidden">
          <SidebarTrigger />
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

function Sidebar({ slug, active, tournamentCount, isSuperAdmin }: { slug: string; active: string; tournamentCount: number; isSuperAdmin: boolean }) {
  return (
    <ShadcnSidebar collapsible="icon" className="text-paper">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-accent text-ink flex items-center justify-center font-display font-bold text-lg">C</span>
          <span className="font-display font-bold text-[19px] tracking-tight group-data-[collapsible=icon]:hidden">CourtOS</span>
          <SidebarTrigger className="ml-auto text-paper/55 hover:text-paper hover:bg-white/5 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-paper/35">Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(item => {
                const isActive = active === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}
                      className="text-paper/55 hover:text-paper data-[active=true]:bg-white/10 data-[active=true]:text-paper">
                      <Link to={`/${slug}/${item.id}` as any}>
                        <Icon name={item.icon} className="w-[18px] h-[18px]" stroke={2.2} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.id === 'tournaments' && tournamentCount > 0 && (
                      <SidebarMenuBadge className="text-[11px] tnum font-bold bg-accent text-ink px-1.5 rounded-full peer-data-[active=true]/menu-button:text-ink">
                        {tournamentCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {isSuperAdmin && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin" className="text-red-400 hover:text-red-400 hover:bg-white/5">
                <Link to="/admin">
                  <Icon name="bolt" className="w-[18px] h-[18px]" stroke={2.2} />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9',
              },
            }}
          />
          <div className="text-left min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="text-[13px] font-semibold truncate capitalize">{slug.replace(/-/g, ' ')}</div>
            <div className="text-[11px] text-paper/45">Organiser</div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </ShadcnSidebar>
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
