import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireSuperAdmin } from "./lib/auth";

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
