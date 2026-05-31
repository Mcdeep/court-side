import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { internal } from "./_generated/api";

export const submit = mutation({
  args: {
    matchId: v.id("matches"),
    submittedBy: v.id("participants"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.state === "completed") throw new Error("Match already completed");

    const existing = await ctx.db
      .query("scores")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .take(10);

    if (existing.length > 0) {
      const prior = existing[0];
      const isConflict =
        prior.scoreA !== args.scoreA || prior.scoreB !== args.scoreB;

      if (isConflict) {
        await ctx.db.patch(args.matchId, { state: "disputed" });
        await ctx.db.insert("scores", {
          matchId: args.matchId,
          submittedBy: args.submittedBy,
          scoreA: args.scoreA,
          scoreB: args.scoreB,
          state: "disputed",
        });
        await ctx.db.patch(prior._id, { state: "disputed" });
        return { status: "disputed" };
      }

      // Scores match — approve
      await ctx.db.patch(args.matchId, { state: "completed" });
      await ctx.db.patch(prior._id, { state: "approved" });
      await ctx.scheduler.runAfter(0, internal.leaderboard.recalculate, {
        matchId: args.matchId,
        scoreA: args.scoreA,
        scoreB: args.scoreB,
      });
      return { status: "approved" };
    }

    await ctx.db.insert("scores", {
      matchId: args.matchId,
      submittedBy: args.submittedBy,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
      state: "pending",
    });
    await ctx.db.patch(args.matchId, { state: "score_pending" });
    return { status: "pending" };
  },
});

export const resolve = mutation({
  args: {
    matchId: v.id("matches"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    const scores = await ctx.db
      .query("scores")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .take(10);

    for (const score of scores) {
      await ctx.db.patch(score._id, { state: "approved" });
    }

    await ctx.db.patch(args.matchId, { state: "completed" });
    await ctx.scheduler.runAfter(0, internal.leaderboard.recalculate, {
      matchId: args.matchId,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
    });
  },
});

export const listByMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("scores")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .take(10);
  },
});

export const saveResult = mutation({
  args: {
    matchId: v.id("matches"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.state === "completed") throw new Error("Match already completed");
    await ctx.db.patch(args.matchId, { state: "completed", scoreA: args.scoreA, scoreB: args.scoreB });
    await ctx.scheduler.runAfter(0, internal.leaderboard.recalculate, {
      matchId: args.matchId,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
    });
  },
});
