import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin, requireOrgAdminOrPin } from "./lib/auth";
import { internal } from "./_generated/api";

const formatValidator = v.union(
  v.literal("americano"),
  v.literal("mexicano"),
  v.literal("knockout"),
  v.literal("round_robin"),
  v.literal("king_of_the_court"),
  v.literal("snakes_and_ladders"),
  v.literal("team_clash"),
);

const scoringModeValidator = v.union(v.literal("first_to"), v.literal("shared_total"), v.literal("time_based"));

const stateValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("registration_open"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("archived"),
);

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    venueId: v.id("venues"),
    name: v.string(),
    format: formatValidator,
    courtCount: v.optional(v.number()),
    roundDurationMs: v.optional(v.number()),
    pointsToWin: v.optional(v.number()),
    scoringMode: v.optional(scoringModeValidator),
    startsAt: v.number(),
    endsAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new Error("Venue not found");
    const courtCount = args.courtCount ?? venue.courtCount;
    if (courtCount < 1) throw new Error("Need at least 1 court");
    if (courtCount > venue.courtCount) throw new Error(`Venue only has ${venue.courtCount} courts`);
    return ctx.db.insert("tournaments", {
      organizationId: args.organizationId,
      venueId: args.venueId,
      name: args.name,
      format: args.format,
      courtCount,
      roundDurationMs: args.roundDurationMs,
      pointsToWin: args.pointsToWin,
      scoringMode: args.scoringMode,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      state: "draft",
    });
  },
});

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tournaments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);
  },
});

export const listMyTournaments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return [];

    const participations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(200);

    const seen = new Set<string>();
    const tournaments = [];
    for (const p of participations) {
      if (seen.has(p.tournamentId)) continue;
      seen.add(p.tournamentId);
      const t = await ctx.db.get(p.tournamentId);
      if (!t) continue;
      const org = await ctx.db.get(t.organizationId);
      tournaments.push({
        ...t,
        clubName: org?.name ?? "Unknown",
        orgSlug: org?.slug ?? "",
      });
    }
    return tournaments.sort((a, b) => b.startsAt - a.startsAt);
  },
});

export const listByOrgIds = query({
  args: { organizationIds: v.array(v.id("organizations")) },
  handler: async (ctx, args) => {
    const all = await Promise.all(
      args.organizationIds.map(async (orgId) => {
        const tournaments = await ctx.db
          .query("tournaments")
          .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
          .order("desc")
          .take(50);
        return Promise.all(
          tournaments.map(async (t) => {
            const org = await ctx.db.get(t.organizationId);
            return { ...t, clubName: org?.name ?? "Unknown", orgSlug: org?.slug ?? "" };
          })
        );
      })
    );
    return all.flat().sort((a, b) => b.startsAt - a.startsAt);
  },
});

export const listWithDetails = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(50);

    return Promise.all(
      tournaments.map(async (t) => {
        const rounds = await ctx.db
          .query("rounds")
          .withIndex("by_tournament", q => q.eq("tournamentId", t._id))
          .take(100);
        const totalRounds = rounds.length;
        const completedRounds = rounds.filter(r => r.state === "completed").length;
        return {
          ...t,
          totalRounds,
          completedRounds,
        };
      })
    );
  },
});

export const get = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.tournamentId);
  },
});

export const getPublic = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.tournamentId);
    if (!t) return null;
    const org = await ctx.db.get(t.organizationId);
    const venue = await ctx.db.get(t.venueId);
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);
    return {
      _id: t._id,
      name: t.name,
      format: t.format,
      state: t.state,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      clubName: org?.name ?? "Unknown",
      venueName: venue?.name ?? "Unknown",
      playerCount: participants.length,
    };
  },
});

// Public — deliberately no Clerk auth. Doubles as the PIN check for the
// /manage/:id page: returns the tournament only if the pin matches.
export const getForManage = query({
  args: { tournamentId: v.id("tournaments"), pin: v.string() },
  handler: async (ctx, args) => {
    const t = await ctx.db.get(args.tournamentId);
    if (!t || !t.managePin || t.managePin !== args.pin) return null;
    return t;
  },
});

export const update = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    name: v.optional(v.string()),
    courtCount: v.optional(v.number()),
    roundDurationMs: v.optional(v.number()),
    pointsToWin: v.optional(v.number()),
    scoringMode: v.optional(scoringModeValidator),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    if (args.pointsToWin !== undefined && (!Number.isInteger(args.pointsToWin) || args.pointsToWin < 1)) {
      throw new Error("Points target must be a positive whole number");
    }
    if (args.courtCount !== undefined) {
      const hasRounds = await ctx.db
        .query("rounds")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
        .take(1);
      if (hasRounds.length > 0) throw new Error("Cannot change court count after rounds are generated");
      const venue = await ctx.db.get(tournament.venueId);
      if (args.courtCount < 1) throw new Error("Need at least 1 court");
      if (venue && args.courtCount > venue.courtCount) {
        throw new Error(`Venue only has ${venue.courtCount} courts`);
      }
    }
    const { tournamentId, ...patch } = args;
    const filteredPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(args.tournamentId, filteredPatch);
  },
});

export const duplicate = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.tournamentId);
    if (!source) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, source.organizationId);

    const durationMs = source.endsAt - source.startsAt;
    const startsAt = Date.now() + 60 * 60 * 1000;
    return ctx.db.insert("tournaments", {
      organizationId: source.organizationId,
      venueId: source.venueId,
      name: `${source.name} (Copy)`,
      format: source.format,
      courtCount: source.courtCount,
      roundDurationMs: source.roundDurationMs,
      pointsToWin: source.pointsToWin,
      scoringMode: source.scoringMode,
      startsAt,
      endsAt: startsAt + durationMs,
      state: "draft",
    });
  },
});

export const deleteTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    if (tournament.state !== "draft") throw new Error("Only draft tournaments can be deleted");
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", q => q.eq("tournamentId", args.tournamentId))
      .take(1);
    if (rounds.length > 0) throw new Error("Cannot delete a tournament with rounds");
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", q => q.eq("tournamentId", args.tournamentId))
      .take(100);
    for (const p of participants) await ctx.db.delete(p._id);
    await ctx.db.delete(args.tournamentId);
  },
});

// Scoped in_progress -> completed transition, callable by an org admin or
// by the tournament's manage PIN (courtside staff running /manage have no
// Clerk session) -- unlike updateState, which only allows an org admin and
// can move a tournament through any state.
export const finish = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdminOrPin(ctx, tournament, args.pin);
    if (tournament.state !== "in_progress") throw new Error("Tournament is not in progress");
    await ctx.db.patch(args.tournamentId, { state: "completed" });
    await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, {
      tournamentId: args.tournamentId,
    });
  },
});

export const updateState = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    state: stateValidator,
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    await ctx.db.patch(args.tournamentId, { state: args.state });
    if (args.state === "completed") {
      await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, {
        tournamentId: args.tournamentId,
      });
    }
  },
});
