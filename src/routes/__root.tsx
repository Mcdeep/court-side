import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ClerkProvider, useAuth, useOrganization, useOrganizationList } from '@clerk/tanstack-start'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient, useMutation } from 'convex/react'
import { useEffect } from 'react'
import { api } from '#/../convex/_generated/api'

import appCss from '../styles.css?url'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'CourtOS' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  component: RootProviders,
})

function RootProviders() {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync />
        <AutoActivateOrg />
        <Outlet />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

function UserSync() {
  const { isSignedIn } = useAuth()
  const upsert = useMutation(api.users.upsert)
  useEffect(() => {
    if (isSignedIn) upsert()
  }, [isSignedIn])
  return null
}

// Clerk doesn't auto-activate an org for members added via the backend API,
// so if the user has no active org but belongs to exactly one, activate it.
// Runs on every route (not just the homepage) so deep links work too.
function AutoActivateOrg() {
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const { isLoaded: membershipsLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: true,
  })

  useEffect(() => {
    if (!orgLoaded || !membershipsLoaded || organization || !setActive) return
    const memberships = userMemberships?.data ?? []
    if (memberships.length === 1) {
      setActive({ organization: memberships[0].organization.id })
    }
  }, [orgLoaded, membershipsLoaded, organization, userMemberships, setActive])

  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
