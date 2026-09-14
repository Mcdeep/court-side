import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireOrgAdmin, requireOrgAdminOrPin } from "./lib/auth";
import { isDoubleAmericano } from "./lib/doubleAmericano";
import { hasRatingAwards } from "./lib/tournamentStandings";
import { getRankingOrder } from "./lib/tiebreaks";
import { generationArgs, generationSnapshotValidator, roundPlansValidator, prepareRoundGeneration, generateRoundPlans } from "./lib/roundGeneration";

export const prepareGeneration = internalQuery({
  args: generationArgs,
  returns: generationSnapshotValidator,
  handler: prepareRoundGeneration,
});

export const generate = action({
  args: generationArgs,
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const prepared = await ctx.runQuery(internal.rounds.prepareGeneration, args);
    const roundPlans = generateRoundPlans(prepared.inputs);
    return await ctx.runMutation(internal.rounds.commitRoundPlans, { ...args, snapshot: prepared.snapshot, roundPlans });
  },
});

export const commitRoundPlans = internalMutation({
  args: { ...generationArgs, snapshot: v.string(), roundPlans: roundPlansValidator },
  returns: v.number(),
  handler: async (ctx, args) => {
    const prepared = await prepareRoundGeneration(ctx, args);
    if (prepared.snapshot !== args.snapshot) {
      throw new Error("Tournament inputs changed while generating. Please generate again.");
    }
    const stage = prepared.inputs.kind === "double_group" ? "group" : prepared.inputs.kind === "double_final" ? "final" : undefined;
    const baseRoundNumber = prepared.roundCount;
    const roundPlans = args.roundPlans;
    for (let r = 0; r < roundPlans.length; r++) {
      const roundId = await ctx.db.insert("rounds", {
        tournamentId: args.tournamentId,
        roundNumber: baseRoundNumber + r + 1,
        state: "pending",
        stage,
      });

      for (const match of roundPlans[r]) {
        const pairAId = await ctx.db.insert("pairs", {
          tournamentId: args.tournamentId,
          participantAId: match.pairA[0],
          participantBId: match.pairA[1],
        });

        const pairBId = await ctx.db.insert("pairs", {
          tournamentId: args.tournamentId,
          participantAId: match.pairB[0],
          participantBId: match.pairB[1],
        });

        await ctx.db.insert("matches", {
          roundId,
          courtNumber: match.courtNumber,
          finalMatchIndex: match.finalMatchIndex,
          pairAId,
          pairBId,
          state: "scheduled",
        });
      }
    }

    if (stage === "final") {
      const tournament = await ctx.db.get(args.tournamentId);
      await ctx.db.patch(args.tournamentId, { tiebreakOrderLocked: true, tiebreakOrder: getRankingOrder(tournament!.tiebreakOrder) });
    }
    if (prepared.roundCount === 0) {
      const managePin = String(Math.floor(1000 + Math.random() * 9000));
      await ctx.db.patch(args.tournamentId, { state: "in_progress", managePin });
    }
    return roundPlans.length;
  },
});

export const list = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(200);
  },
});

export const start = mutation({
  args: { roundId: v.id("rounds"), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdminOrPin(ctx, tournament, args.pin);
    if (round.state !== "pending") throw new Error("Round already started");

    const allRounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", round.tournamentId))
      .take(200);
    const previousRounds = allRounds.filter((r) => r.roundNumber < round.roundNumber);
    for (const prev of previousRounds) {
      if (prev.state !== "completed") {
        throw new Error(`Round ${prev.roundNumber} must be completed first`);
      }
      const prevMatches = await ctx.db
        .query("matches")
        .withIndex("by_round", (q) => q.eq("roundId", prev._id))
        .take(50);
      for (const match of prevMatches) {
        if (match.scoreA === undefined || match.scoreB === undefined) {
          throw new Error(`Record all scores for round ${prev.roundNumber} first`);
        }
      }
    }

    await ctx.db.patch(args.roundId, { state: "in_progress", startedAt: Date.now() });
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_round", q => q.eq("roundId", args.roundId))
      .take(50);
    for (const match of matches) {
      if (match.state === "scheduled") {
        await ctx.db.patch(match._id, { state: "in_progress" });
      }
    }
  },
});

export const complete = mutation({
  args: { roundId: v.id("rounds"), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdminOrPin(ctx, tournament, args.pin);
    if (round.state !== "in_progress") throw new Error("Round not in progress");
    await ctx.db.patch(args.roundId, { state: "completed" });
  },
});

export const resetSchedule = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);

    for (const round of rounds) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .take(50);
      for (const match of matches) {
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .take(50);
        for (const score of scores) await ctx.db.delete(score._id);
        await ctx.db.delete(match._id);
        await ctx.db.delete(match.pairAId);
        await ctx.db.delete(match.pairBId);
      }
      await ctx.db.delete(round._id);
    }

    const leaderboardEntries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);
    for (const entry of leaderboardEntries) await ctx.db.delete(entry._id);

    await ctx.db.patch(args.tournamentId, {
      state: "registration_open",
      tiebreakOrderLocked: tournament.tiebreakOrderLocked || tournament.state === "completed" || tournament.state === "archived",
    });
  },
});

export const updateState = internalMutation({
  args: {
    roundId: v.id("rounds"),
    state: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roundId, { state: args.state });
  },
});

export const resetFinals = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    if (!isDoubleAmericano(tournament)) throw new Error("Crossover finals are only available for Double Americano");
    if (tournament.state === "completed" || tournament.state === "archived" || await hasRatingAwards(ctx, tournament)) throw new Error("Cannot reset finals after the tournament has finished");
    const rounds = await ctx.db.query("rounds").withIndex("by_tournament", q => q.eq("tournamentId", args.tournamentId)).take(200);
    for (const round of rounds.filter(candidate => candidate.stage === "final")) {
      const matches = await ctx.db.query("matches").withIndex("by_round", q => q.eq("roundId", round._id)).take(50);
      for (const match of matches) {
        const scores = await ctx.db.query("scores").withIndex("by_match", q => q.eq("matchId", match._id)).take(50);
        for (const score of scores) await ctx.db.delete(score._id);
        await ctx.db.delete(match._id);
        await ctx.db.delete(match.pairAId);
        await ctx.db.delete(match.pairBId);
      }
      await ctx.db.delete(round._id);
    }
    await ctx.db.patch(args.tournamentId, { tiebreakOrderLocked: false });
    return null;
  },
});
