import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignedIn, SignedOut, SignInButton, UserButton, useOrganizationList } from '@clerk/tanstack-start'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <header className="flex items-center justify-between px-8 h-16 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-ink text-paper flex items-center justify-center font-display font-bold text-lg">C</span>
          <span className="font-display font-bold text-[19px] tracking-tight">CourtOS</span>
        </div>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-ink text-paper rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-8 py-12">
        {isLoading && (
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-zinc-100 rounded-xl mb-4" />
            <div className="h-32 bg-zinc-100 rounded-2xl" />
          </div>
        )}

        {!isLoading && !isAuthenticated && (
          <div className="text-center py-20">
            <h1 className="font-display text-[40px] font-bold tracking-tight mb-3">
              Tournament management for padel
            </h1>
            <p className="text-ink-mute text-lg mb-8 max-w-md mx-auto">
              Run tournaments across 6 formats, manage players, and display live scores.
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-ink text-paper rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors">
                Sign in to get started
              </button>
            </SignInButton>
          </div>
        )}

        {!isLoading && isAuthenticated && <SmartRedirect />}
      </main>
    </div>
  )
}

function SmartRedirect() {
  const navigate = useNavigate()
  const me = useQuery(api.users.me)
  const allOrgs = useQuery(api.organizations.list)
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  useEffect(() => {
    if (me === undefined || allOrgs === undefined || !orgsLoaded) return

    const isAdmin = me?.isSuperAdmin
    const myMemberships = userMemberships.data ?? []
    const myClerkOrgIds = new Set(myMemberships.map(m => m.organization.id))
    const isOrgAdmin = myMemberships.some(m => m.role === 'org:admin')

    if (isAdmin) {
      // Super admin -> first org they admin, or /admin
      const adminOrg = allOrgs.find(o => myClerkOrgIds.has(o.clerkOrgId))
      if (adminOrg) {
        navigate({ to: `/${adminOrg.slug}/tournaments` as any })
      } else {
        navigate({ to: '/admin' })
      }
    } else if (isOrgAdmin) {
      // Org admin -> their org dashboard
      const adminOrg = allOrgs.find(o => myClerkOrgIds.has(o.clerkOrgId))
      if (adminOrg) {
        navigate({ to: `/${adminOrg.slug}/tournaments` as any })
      } else {
        navigate({ to: '/dashboard' })
      }
    } else {
      // Member -> flat dashboard
      navigate({ to: '/dashboard' })
    }
  }, [me, allOrgs, orgsLoaded, userMemberships, navigate])

  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-zinc-100 rounded-xl mb-4" />
      <div className="h-32 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
