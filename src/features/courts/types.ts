import type { FunctionReturnType } from 'convex/server'
import type { api } from '#/../convex/_generated/api'

export type Venue = FunctionReturnType<typeof api.venues.listByOrg>[number]
