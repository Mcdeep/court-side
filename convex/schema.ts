import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended")),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_slug", ["slug"]),

  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  venues: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    courtCount: v.number(),
  }).index("by_organization", ["organizationId"]),

  tournaments: defineTable({
    organizationId: v.id("organizations"),
    venueId: v.id("venues"),
    name: v.string(),
    format: v.union(
      v.literal("americano"),
      v.literal("mexicano"),
      v.literal("knockout"),
      v.literal("round_robin"),
      v.literal("king_of_the_court"),
      v.literal("snakes_and_ladders"),
      v.literal("team_clash"),
    ),
    state: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("registration_open"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    startsAt: v.number(),
    endsAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_venue", ["venueId"]),

  participants: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.optional(v.id("users")),
    entryType: v.union(
      v.literal("solo"),
      v.literal("pair"),
      v.literal("team"),
    ),
    teamId: v.optional(v.id("teams")),
    isWalkIn: v.boolean(),
    walkInName: v.optional(v.string()),
  }).index("by_tournament", ["tournamentId"]),

  pairs: defineTable({
    tournamentId: v.id("tournaments"),
    participantAId: v.id("participants"),
    participantBId: v.id("participants"),
  }).index("by_tournament", ["tournamentId"]),

  teams: defineTable({
    tournamentId: v.id("tournaments"),
    name: v.string(),
  }).index("by_tournament", ["tournamentId"]),

  rounds: defineTable({
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
    state: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  }).index("by_tournament", ["tournamentId"]),

  matches: defineTable({
    roundId: v.id("rounds"),
    courtNumber: v.number(),
    pairAId: v.id("pairs"),
    pairBId: v.id("pairs"),
    state: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("score_pending"),
      v.literal("completed"),
      v.literal("disputed"),
    ),
  }).index("by_round", ["roundId"]),

  scores: defineTable({
    matchId: v.id("matches"),
    submittedBy: v.id("participants"),
    scoreA: v.number(),
    scoreB: v.number(),
    state: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("disputed"),
    ),
  }).index("by_match", ["matchId"]),

  leaderboard: defineTable({
    tournamentId: v.id("tournaments"),
    participantId: v.id("participants"),
    points: v.number(),
    wins: v.number(),
    losses: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_points", ["tournamentId", "points"]),
});
