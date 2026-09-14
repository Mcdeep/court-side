import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin, requireOrgAdminOrPin, requireOrgMember } from "./lib/auth";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { getRecordedScore } from "./lib/recordedScore";

function previousResult(match: Doc<"matches">) {
  const result = getRecordedScore(match);
  if (match.state === "completed" && !result) {
    throw new Error("The original result is unavailable. Restore the original match score before correcting it.");
  }
  return result;
}

function assertValidScores(tournament: Doc<"tournaments">, scoreA: number, scoreB: number) {
  if (tournament.scoringMode === "shared_total" && tournament.pointsToWin !== undefined) {
    if (scoreA + scoreB !== tournament.pointsToWin) {
      throw new Error(`Scores must add up to ${tournament.pointsToWin}`);
    }
  }
}

export const submit = mutation({
  args: {
    matchId: v.id("matches"),
    submittedBy: v.id("participants"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgMember(ctx, tournament.organizationId);
    assertValidScores(tournament, args.scoreA, args.scoreB);

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
      await ctx.db.patch(args.matchId, { state: "completed", scoreA: args.scoreA, scoreB: args.scoreB });
      await ctx.db.patch(prior._id, { state: "approved" });
      await ctx.scheduler.runAfter(0, internal.leaderboard.recalculate, {
        matchId: args.matchId,
        scoreA: args.scoreA,
        scoreB: args.scoreB,
      });
      if (tournament.format === "americano" && (tournament.state === "completed" || tournament.state === "archived")) {
        await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, { tournamentId: tournament._id });
      }
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
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    assertValidScores(tournament, args.scoreA, args.scoreB);
    const previous = previousResult(match);

    const scores = await ctx.db
      .query("scores")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .take(10);

    for (const score of scores) {
      await ctx.db.patch(score._id, { state: "approved", scoreA: args.scoreA, scoreB: args.scoreB });
    }

    await ctx.db.patch(args.matchId, { state: "completed", scoreA: args.scoreA, scoreB: args.scoreB });
    await ctx.scheduler.runAfter(0, internal.leaderboard.recalculate, {
      matchId: args.matchId,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
      prevScoreA: previous?.scoreA,
      prevScoreB: previous?.scoreB,
    });
    if (tournament.format === "americano" && (tournament.state === "completed" || tournament.state === "archived")) {
      await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, { tournamentId: tournament._id });
    }
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
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdminOrPin(ctx, tournament, args.pin);
    assertValidScores(tournament, args.scoreA, args.scoreB);
    const previous = previousResult(match);
    const prevScoreA = previous?.scoreA;
    const prevScoreB = previous?.scoreB;
    await ctx.db.patch(args.matchId, { state: "completed", scoreA: args.scoreA, scoreB: args.scoreB });
    await ctx.scheduler.runAfter(0, internal.leaderboard.recalculate, {
      matchId: args.matchId,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
      prevScoreA,
      prevScoreB,
    });
    if (tournament.format === "americano" && (tournament.state === "completed" || tournament.state === "archived")) {
      await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, { tournamentId: tournament._id });
    }
  },
});
