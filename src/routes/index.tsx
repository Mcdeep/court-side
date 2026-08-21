import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignedIn, SignedOut, SignInButton, UserButton, useOrganization, useOrganizationList } from '@clerk/tanstack-start'
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
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const { isLoaded: membershipsLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: true,
  })

  // Clerk doesn't auto-activate an org for members added via the backend API,
  // so if the user has no active org but belongs to exactly one, activate it.
  useEffect(() => {
    if (!orgLoaded || !membershipsLoaded || organization || !setActive) return
    const memberships = userMemberships?.data ?? []
    if (memberships.length === 1) {
      setActive({ organization: memberships[0].organization.id })
    }
  }, [orgLoaded, membershipsLoaded, organization, userMemberships, setActive])

  useEffect(() => {
    if (me === undefined || allOrgs === undefined || !orgLoaded || !membershipsLoaded) return

    if (me?.isSuperAdmin) {
      const firstOrg = allOrgs[0]
      if (firstOrg) {
        navigate({ to: `/${firstOrg.slug}/tournaments` as any })
      } else {
        navigate({ to: '/admin' })
      }
      return
    }

    if (organization) {
      const org = allOrgs.find(o => o.clerkOrgId === organization.id)
      if (org) {
        navigate({ to: `/${org.slug}/tournaments` as any })
        return
      }
    }

    // If we have exactly one membership but haven't activated it yet, wait for that effect.
    if (!organization && (userMemberships?.data?.length ?? 0) === 1) return

    navigate({ to: '/dashboard' })
  }, [me, allOrgs, orgLoaded, membershipsLoaded, organization, userMemberships, navigate])

  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-zinc-100 rounded-xl mb-4" />
      <div className="h-32 bg-zinc-100 rounded-2xl" />
    </div>
  )
}
