import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const add = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.optional(v.id("users")),
    entryType: v.union(v.literal("solo"), v.literal("pair"), v.literal("team")),
    isWalkIn: v.boolean(),
    walkInName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
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

export const remove = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const tournament = await ctx.db.get(participant.tournamentId);
    if (tournament?.state === "in_progress" || tournament?.state === "completed") {
      throw new Error("Cannot remove participant from active tournament");
    }
    await ctx.db.delete(args.participantId);
  },
});
