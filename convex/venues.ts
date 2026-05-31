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
