import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "./lib/auth";

const MIN_SKILL_RATING = 1;
const MAX_SKILL_RATING = 7;

function assertValidSkillRating(skillRating: number | undefined) {
  if (skillRating === undefined) return;
  if (skillRating < MIN_SKILL_RATING || skillRating > MAX_SKILL_RATING) {
    throw new Error(`Rating must be between ${MIN_SKILL_RATING} and ${MAX_SKILL_RATING}`);
  }
}

export const add = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    skillRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    assertValidSkillRating(args.skillRating);
    return ctx.db.insert("members", {
      organizationId: args.organizationId,
      name,
      skillRating: args.skillRating,
    });
  },
});

export const bulkImport = mutation({
  args: {
    organizationId: v.id("organizations"),
    rows: v.array(v.object({
      name: v.string(),
      startingPoints: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    const ids = [];
    for (const row of args.rows) {
      const name = row.name.trim();
      if (!name) continue;
      ids.push(await ctx.db.insert("members", {
        organizationId: args.organizationId,
        name,
        startingPoints: row.startingPoints,
      }));
    }
    return { imported: ids.length };
  },
});

export const link = mutation({
  args: {
    memberId: v.id("members"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrgAdmin(ctx, member.organizationId);
    if (member.userId) throw new Error("Member is already linked");

    const existingLink = await ctx.db
      .query("members")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", member.organizationId).eq("userId", args.userId)
      )
      .unique();
    if (existingLink) throw new Error("This account is already linked to another roster member");

    await ctx.db.patch(args.memberId, { userId: args.userId });

    if (member.startingPoints !== undefined) {
      const existingRating = await ctx.db
        .query("playerRatings")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", member.organizationId).eq("userId", args.userId)
        )
        .unique();
      if (!existingRating) {
        await ctx.db.insert("playerRatings", {
          organizationId: member.organizationId,
          userId: args.userId,
          totalPoints: member.startingPoints,
          tournamentsPlayed: 0,
        });
      }
    }
  },
});

export const unlink = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrgAdmin(ctx, member.organizationId);
    await ctx.db.patch(args.memberId, { userId: undefined });
  },
});

export const remove = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrgAdmin(ctx, member.organizationId);
    const referenced = await ctx.db
      .query("participants")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .take(1);
    if (referenced.length > 0) {
      throw new Error("Cannot remove a member who has already played in a tournament");
    }
    await ctx.db.delete(args.memberId);
  },
});

export const setSkillRating = mutation({
  args: {
    memberId: v.id("members"),
    skillRating: v.number(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrgAdmin(ctx, member.organizationId);
    if (member.userId) {
      throw new Error("Set ratings for linked members from their account rating instead");
    }
    assertValidSkillRating(args.skillRating);
    await ctx.db.patch(args.memberId, { skillRating: args.skillRating });
  },
});

export const listByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(500);

    const resolved = await Promise.all(
      members.map(async (m) => {
        const user = m.userId ? await ctx.db.get(m.userId) : null;
        return {
          ...m,
          email: user?.email,
        };
      })
    );
    return resolved.sort((a, b) => a.name.localeCompare(b.name));
  },
});
