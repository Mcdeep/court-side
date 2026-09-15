import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin, requireUser } from "./lib/auth";

export const myOrgs = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.organizationId);
        return org ? { ...org, role: m.role } : null;
      }),
    );
    return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
  },
});

export const listForOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(200);

    return Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          userId: m.userId,
          name: user?.name ?? "Unknown",
          email: user?.email ?? "Unknown",
          role: m.role,
        };
      }),
    );
  },
});

export const assign = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_and_organization", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("memberships", {
        userId: args.userId,
        organizationId: args.organizationId,
        role: args.role,
      });
    }
  },
});

export const remove = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_and_organization", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
