import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOrgAdmin } from "./lib/auth";

// A series groups recurring tournaments (e.g. a weekly "Tuesday Americano")
// so rankings can be viewed for just that event. A tournament belongs to at
// most one series via tournaments.seriesId.

const MAX_SERIES_PER_ORG = 100;

export async function requireSeriesInOrg(
  ctx: QueryCtx | MutationCtx,
  seriesId: Id<"series">,
  organizationId: Id<"organizations">,
): Promise<Doc<"series">> {
  const series = await ctx.db.get(seriesId);
  if (!series || series.organizationId !== organizationId) throw new Error("Series not found");
  return series;
}

async function validateName(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  rawName: string,
  excludeId?: Id<"series">,
) {
  const name = rawName.trim();
  if (!name) throw new Error("Series name required");
  const existing = await ctx.db
    .query("series")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .take(MAX_SERIES_PER_ORG);
  const clash = existing.find(
    (s) => s._id !== excludeId && s.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) throw new Error(`A series called "${clash.name}" already exists`);
  return name;
}

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const series = await ctx.db
      .query("series")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(MAX_SERIES_PER_ORG);
    return series.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: { organizationId: v.id("organizations"), name: v.string() },
  returns: v.id("series"),
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    const name = await validateName(ctx, args.organizationId, args.name);
    return ctx.db.insert("series", { organizationId: args.organizationId, name });
  },
});

export const rename = mutation({
  args: { seriesId: v.id("series"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.seriesId);
    if (!series) throw new Error("Series not found");
    await requireOrgAdmin(ctx, series.organizationId);
    const name = await validateName(ctx, series.organizationId, args.name, series._id);
    await ctx.db.patch(series._id, { name });
    return null;
  },
});

// Tournaments in the series keep their results and ratings; they just no
// longer belong to a series.
export const remove = mutation({
  args: { seriesId: v.id("series") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.seriesId);
    if (!series) throw new Error("Series not found");
    await requireOrgAdmin(ctx, series.organizationId);
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_organization_and_seriesId", (q) =>
        q.eq("organizationId", series.organizationId).eq("seriesId", series._id),
      )
      .take(500);
    for (const tournament of tournaments)
      await ctx.db.patch(tournament._id, { seriesId: undefined });
    await ctx.db.delete(series._id);
    return null;
  },
});
