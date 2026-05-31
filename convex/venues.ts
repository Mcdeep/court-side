import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const listByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("venues")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(100);
  },
});

export const update = mutation({
  args: {
    venueId: v.id("venues"),
    name: v.string(),
    courtCount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new Error("Venue not found");
    if (!args.name.trim()) throw new Error("Name required");
    if (args.courtCount < 1) throw new Error("Must have at least 1 court");
    await ctx.db.patch(args.venueId, { name: args.name.trim(), courtCount: args.courtCount });
  },
});

export const deleteVenue = mutation({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new Error("Venue not found");
    const linked = await ctx.db
      .query("tournaments")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .take(1);
    if (linked.length > 0) throw new Error("Cannot delete a venue with tournaments");
    await ctx.db.delete(args.venueId);
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    courtCount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.insert("venues", args);
  },
});
