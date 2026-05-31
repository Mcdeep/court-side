import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

const formatValidator = v.union(
  v.literal("americano"),
  v.literal("mexicano"),
  v.literal("knockout"),
  v.literal("round_robin"),
  v.literal("king_of_the_court"),
  v.literal("snakes_and_ladders"),
  v.literal("team_clash"),
);

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
    startsAt: v.number(),
    endsAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.insert("tournaments", {
      ...args,
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
        const venue = await ctx.db.get(t.venueId);
        const rounds = await ctx.db
          .query("rounds")
          .withIndex("by_tournament", q => q.eq("tournamentId", t._id))
          .take(100);
        const totalRounds = rounds.length;
        const completedRounds = rounds.filter(r => r.state === "completed").length;
        return {
          ...t,
          courtCount: venue?.courtCount ?? 0,
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

export const update = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    name: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    const { tournamentId, ...patch } = args;
    const filteredPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(args.tournamentId, filteredPatch);
  },
});

export const deleteTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
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

export const updateState = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    state: stateValidator,
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await ctx.db.patch(args.tournamentId, { state: args.state });
  },
});
