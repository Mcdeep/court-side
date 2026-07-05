import type { FunctionReturnType } from 'convex/server'
import type { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'

export type Tournament = NonNullable<FunctionReturnType<typeof api.tournaments.get>>

export type TournamentFormat =
  | 'americano' | 'mexicano' | 'knockout' | 'round_robin'
  | 'king_of_the_court' | 'snakes_and_ladders' | 'team_clash'

export type TournamentState =
  | 'draft' | 'published' | 'registration_open'
  | 'in_progress' | 'completed' | 'archived'

export type Participant = FunctionReturnType<typeof api.participants.list>[number]

export type Round = FunctionReturnType<typeof api.rounds.list>[number]

export type Match = FunctionReturnType<typeof api.matches.listByRound>[number]

export type LeaderboardEntry = FunctionReturnType<typeof api.leaderboard.get>[number]

export type Venue = FunctionReturnType<typeof api.venues.listByOrg>[number]

export type { Id }
