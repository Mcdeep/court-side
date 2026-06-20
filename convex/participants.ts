import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const add = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.optional(v.id("users")),
    entryType: v.union(v.literal("solo"), v.literal("pair"), v.literal("team")),
    isWalkIn: v.boolean(),
    walkInName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    if (
      tournament.state !== "draft" &&
      tournament.state !== "registration_open"
    ) {
      throw new Error("Tournament is not accepting participants");
    }
    return ctx.db.insert("participants", {
      tournamentId: args.tournamentId,
      userId: args.userId,
      entryType: args.entryType,
      isWalkIn: args.isWalkIn,
      walkInName: args.walkInName,
    });
  },
});

export const list = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .take(200);

    return Promise.all(
      participants.map(async (p) => ({
        ...p,
        user: p.userId ? await ctx.db.get(p.userId) : null,
      }))
    );
  },
});

export const listByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
      .take(50);

    const memberMap = new Map<string, { userId: Id<"users">; count: number }>();
    const walkInMap = new Map<string, { name: string; count: number }>();

    for (const t of tournaments) {
      const participants = await ctx.db
        .query("participants")
        .withIndex("by_tournament", q => q.eq("tournamentId", t._id))
        .take(200);

      for (const p of participants) {
        if (p.userId) {
          const key = p.userId as string;
          const entry = memberMap.get(key) ?? { userId: p.userId as Id<"users">, count: 0 };
          entry.count++;
          memberMap.set(key, entry);
        } else if (p.isWalkIn && p.walkInName) {
          const key = p.walkInName;
          const entry = walkInMap.get(key) ?? { name: p.walkInName, count: 0 };
          entry.count++;
          walkInMap.set(key, entry);
        }
      }
    }

    const members = await Promise.all(
      [...memberMap.values()].map(async ({ userId, count }) => {
        const user = await ctx.db.get(userId);
        return user ? { ...user, tournamentCount: count } : null;
      })
    );

    return {
      members: members
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .sort((a, b) => b.tournamentCount - a.tournamentCount),
      walkIns: [...walkInMap.values()].sort((a, b) => b.count - a.count),
    };
  },
});

export const remove = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const tournament = await ctx.db.get(participant.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    if (tournament.state === "in_progress" || tournament.state === "completed") {
      throw new Error("Cannot remove participant from active tournament");
    }
    await ctx.db.delete(args.participantId);
  },
});
