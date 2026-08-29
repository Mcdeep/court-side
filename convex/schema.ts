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
    isSuperAdmin: v.optional(v.boolean()),
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
    courtCount: v.optional(v.number()),
    roundDurationMs: v.optional(v.number()),
    pointsToWin: v.optional(v.number()),
    // "first_to" (default): first team to reach pointsToWin wins, scores are independent.
    // "shared_total": each match splits a fixed pool of pointsToWin points between the two teams.
    scoringMode: v.optional(v.union(v.literal("first_to"), v.literal("shared_total"))),
    startsAt: v.number(),
    endsAt: v.number(),
    // Generated when the tournament starts (first round generated). Lets
    // courtside staff run the live tournament from /manage/:id without a
    // Clerk login — see convex/lib/auth.ts requireOrgAdminOrPin.
    managePin: v.optional(v.string()),
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
    // Manually entered by an admin (e.g. from the player's Playtomic level).
    // Walk-ins have no account, so their rating lives on the participant row.
    skillRating: v.optional(v.number()),
    // Opt-in attendance confirmation. Round generation for round-by-round
    // formats only includes checkedIn === true participants.
    checkedIn: v.optional(v.boolean()),
    // Set when this participant was added from the org's member roster
    // (linked or not) — see the `members` table. Lets participation
    // history survive even before/without a linked `users` account.
    memberId: v.optional(v.id("members")),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_member", ["memberId"]),

  // An org's persistent roster of members — registrable/importable ahead
  // of any tournament, independent of the derived participant-history
  // report on the Players page. `userId` is set once an admin manually
  // links a row to a real account; `startingPoints` carries an imported
  // historical points total that seeds `playerRatings.totalPoints` at
  // link time (see convex/members.ts `link`).
  members: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    userId: v.optional(v.id("users")),
    // Running org-points total for a member with no linked account — seeded
    // by import, then incremented by ratings.awardRatings the same way
    // playerRatings.totalPoints is for linked members. Once linked, this
    // stops updating (playerRatings takes over as source of truth).
    startingPoints: v.optional(v.number()),
    tournamentsPlayed: v.optional(v.number()),
    skillRating: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),

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
    startedAt: v.optional(v.number()),
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
    scoreA: v.optional(v.number()),
    scoreB: v.optional(v.number()),
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
    .index("by_tournament_points", ["tournamentId", "points"])
    .index("by_tournament_and_participant", ["tournamentId", "participantId"]),

  ratingConfig: defineTable({
    organizationId: v.id("organizations"),
    tiers: v.array(v.number()),
  }).index("by_organization", ["organizationId"]),

  playerRatings: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    totalPoints: v.number(),
    tournamentsPlayed: v.number(),
    // Manually entered by an org admin (e.g. from the player's Playtomic level).
    // Used to seed skill-based formats like Mexicano before any in-org results exist.
    skillRating: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_points", ["organizationId", "totalPoints"])
    .index("by_organization_and_user", ["organizationId", "userId"])
    .index("by_user", ["userId"]),

  ratingHistory: defineTable({
    organizationId: v.id("organizations"),
    // Exactly one of userId/memberId is set — userId for a linked account,
    // memberId for an unlinked roster member (see ratings.awardRatings).
    userId: v.optional(v.id("users")),
    memberId: v.optional(v.id("members")),
    tournamentId: v.id("tournaments"),
    placement: v.number(),
    pointsEarned: v.number(),
  })
    .index("by_organization_and_user", ["organizationId", "userId"])
    .index("by_tournament", ["tournamentId"]),
});
