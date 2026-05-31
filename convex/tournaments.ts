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

export const get = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.tournamentId);
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
