import { createFileRoute, Link } from '@tanstack/react-router'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/tanstack-start'
import { useConvexAuth, useQuery } from 'convex/react'
import { useOrganizationList } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import { Icon } from '#/components/ui'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* Header */}
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

        {!isLoading && isAuthenticated && <OrgList />}
      </main>
    </div>
  )
}

function OrgList() {
  const allOrgs = useQuery(api.organizations.list)
  const me = useQuery(api.users.me)
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  if (allOrgs === undefined || me === undefined || !orgsLoaded) return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-zinc-100 rounded-xl mb-4" />
      <div className="h-32 bg-zinc-100 rounded-2xl" />
    </div>
  )

  const myClerkOrgIds = new Set(
    (userMemberships.data ?? []).map(m => m.organization.id)
  )
  const orgs = me?.isSuperAdmin
    ? allOrgs
    : allOrgs.filter(o => myClerkOrgIds.has(o.clerkOrgId))

  return (
    <div>
      <h2 className="font-display text-[24px] font-bold tracking-tight mb-5">Your organisations</h2>
      {orgs.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-10 text-center">
          <p className="text-ink-mute text-sm">No organisations yet. Ask an admin to invite you.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orgs.map(org => (
            <Link key={org._id} to={`/${org.slug}/tournaments` as any}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card hover:ring-zinc-300 transition-all">
              <span className="w-11 h-11 rounded-xl bg-ink text-paper flex items-center justify-center font-display font-bold text-lg">
                {org.name[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px]">{org.name}</div>
                <div className="text-[12px] text-ink-mute">/{org.slug}</div>
              </div>
              <Icon name="chevR" className="w-5 h-5 text-zinc-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
