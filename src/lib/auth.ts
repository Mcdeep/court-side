import { useAuth, useUser } from '@clerk/tanstack-react-start'

export type AppRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'organiser'
  | 'member'
  | 'walk_in'

export function useAppRole(): AppRole | null {
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  if (!isSignedIn || !user) return null

  // super_admin stored in user public metadata
  if (user.publicMetadata?.role === 'super_admin') return 'super_admin'

  // org roles: clerk 'admin' -> tenant_admin, 'member' -> organiser
  const orgRole = user.organizationMemberships?.[0]?.role
  if (orgRole === 'org:admin') return 'tenant_admin'
  if (orgRole === 'org:member') return 'organiser'

  return 'member'
}

export function useOrgSlug(): string | null {
  const { orgSlug } = useAuth()
  return orgSlug ?? null
}
