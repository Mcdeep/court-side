import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const verifySuperAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.tokenIdentifier)
      )
      .unique();
    if (!user?.isSuperAdmin) throw new Error("Super admin access required");
    return user;
  },
});

export const insertOrg = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Slug already taken");
    return ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      status: "active",
    });
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const patchOrgClerkId = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, { clerkOrgId: args.clerkOrgId });
  },
});

export const getOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.organizationId);
  },
});
