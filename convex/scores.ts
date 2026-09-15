import { assertGroupResultsEditable } from "./lib/doubleAmericano";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin, requireOrgAdminOrPin, requireOrgMember } from "./lib/auth";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { getRecordedScore } from "./lib/recordedScore";

const previousScoreValidator = v.object({ scoreA: v.number(), scoreB: v.number() });

function previousResult(
  match: Doc<"matches">,
  restored?: NonNullable<ReturnType<typeof getRecordedScore>>,
) {
  const result = getRecordedScore(match);
  if (match.state === "completed" && !result) {
    if (!restored)
      throw new Error(
        "Enter the previous result in the score editor before saving this correction.",
      );
    if ([restored.scoreA, restored.scoreB].some((score) => !Number.isInteger(score) || score < 0)) {
      throw new Error("Previous scores must be non-negative whole numbers");
    }
    return restored;
  }
  return result;
}

function assertValidScores(
  tournament: Doc<"tournaments">,
  scoreA: number,
  scoreB: number,
  round: Doc<"rounds">,
) {
  if (tournament.americanoVariant === "double" && round.stage === "final") {
    if (![scoreA, scoreB].every((score) => Number.isInteger(score) && score >= 0))
      throw new Error("Final scores must be non-negative whole numbers");
    if (scoreA === scoreB)
      throw new Error(
        "Crossover finals need a winner; play a deciding point before recording the result",
      );
  }
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
    await assertGroupResultsEditable(ctx, tournament, round);
    assertValidScores(tournament, args.scoreA, args.scoreB, round);

    if (match.state === "completed") throw new Error("Match already completed");

    const existing = await ctx.db
      .query("scores")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .take(10);

    if (existing.length > 0) {
      const prior = existing[0];
      const isConflict = prior.scoreA !== args.scoreA || prior.scoreB !== args.scoreB;

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
      await ctx.db.patch(args.matchId, {
        state: "completed",
        scoreA: args.scoreA,
        scoreB: args.scoreB,
      });
      await ctx.db.patch(prior._id, { state: "approved" });
      await ctx.runMutation(internal.leaderboard.recalculate, {
        matchId: args.matchId,
        scoreA: args.scoreA,
        scoreB: args.scoreB,
      });
      if (
        tournament.format === "americano" &&
        (tournament.state === "completed" || tournament.state === "archived")
      ) {
        await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, {
          tournamentId: tournament._id,
        });
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
    previousScore: v.optional(previousScoreValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    await assertGroupResultsEditable(ctx, tournament, round);
    assertValidScores(tournament, args.scoreA, args.scoreB, round);
    const previous = previousResult(match, args.previousScore);

    const scores = await ctx.db
      .query("scores")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .take(10);

    for (const score of scores) {
      await ctx.db.patch(score._id, {
        state: "approved",
        scoreA: args.scoreA,
        scoreB: args.scoreB,
      });
    }

    await ctx.db.patch(args.matchId, {
      state: "completed",
      scoreA: args.scoreA,
      scoreB: args.scoreB,
    });
    await ctx.runMutation(internal.leaderboard.recalculate, {
      matchId: args.matchId,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
      prevScoreA: previous?.scoreA,
      prevScoreB: previous?.scoreB,
    });
    if (
      tournament.format === "americano" &&
      (tournament.state === "completed" || tournament.state === "archived")
    ) {
      await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, {
        tournamentId: tournament._id,
      });
    }
    return null;
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
    previousScore: v.optional(previousScoreValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdminOrPin(ctx, tournament, args.pin);
    await assertGroupResultsEditable(ctx, tournament, round);
    assertValidScores(tournament, args.scoreA, args.scoreB, round);
    const previous = previousResult(match, args.previousScore);
    const prevScoreA = previous?.scoreA;
    const prevScoreB = previous?.scoreB;
    await ctx.db.patch(args.matchId, {
      state: "completed",
      scoreA: args.scoreA,
      scoreB: args.scoreB,
    });
    await ctx.runMutation(internal.leaderboard.recalculate, {
      matchId: args.matchId,
      scoreA: args.scoreA,
      scoreB: args.scoreB,
      prevScoreA,
      prevScoreB,
    });
    if (
      tournament.format === "americano" &&
      (tournament.state === "completed" || tournament.state === "archived")
    ) {
      await ctx.scheduler.runAfter(0, internal.ratings.awardRatings, {
        tournamentId: tournament._id,
      });
    }
    return null;
  },
});
