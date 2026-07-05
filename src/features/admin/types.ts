import type { FunctionReturnType } from 'convex/server'
import type { api } from '#/../convex/_generated/api'

export type OrgWithStats = FunctionReturnType<typeof api.organizations.listWithStats>[number]

export type UserRecord = FunctionReturnType<typeof api.users.list>[number]
