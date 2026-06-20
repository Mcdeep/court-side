import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireSuperAdmin } from "./lib/auth";

export const upsert = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.tokenIdentifier)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkUserId: identity.tokenIdentifier,
      name: identity.name ?? "Unknown",
      email: identity.email ?? "",
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    return getUser(ctx);
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("users").take(200);
  },
});

export const setSuperAdmin = mutation({
  args: {
    userId: v.id("users"),
    isSuperAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.userId, { isSuperAdmin: args.isSuperAdmin });
  },
});
