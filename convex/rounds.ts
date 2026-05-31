import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { generateAmericanoRounds } from "./formats/americano";
import { generateRoundRobinRounds } from "./formats/round_robin";
import { generateMexicanoRound } from "./formats/mexicano";
import { Id } from "./_generated/dataModel";

export const generate = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const supported = ["americano", "round_robin", "mexicano"];
    if (!supported.includes(tournament.format)) {
      throw new Error(`Format "${tournament.format}" not yet supported`);
    }

    const venue = await ctx.db.get(tournament.venueId);
    if (!venue) throw new Error("Venue not found");

    const PRE_GENERATED = ["americano", "round_robin"];
    const existingRounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .order("asc")
      .take(200);

    if (PRE_GENERATED.includes(tournament.format) && existingRounds.length > 0) {
      throw new Error("Rounds already generated for this tournament");
    }
    if (tournament.format === "mexicano" && existingRounds.length > 0) {
      const last = existingRounds[existingRounds.length - 1];
      if (last.state !== "completed") {
        throw new Error("Complete the current round before generating the next");
      }
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .take(200);

    if (participants.length < 4) {
      throw new Error("Need at least 4 participants to generate rounds");
    }

    const participantIds = participants.map((p) => p._id as string);

    let roundPlans;
    if (tournament.format === "round_robin") {
      roundPlans = generateRoundRobinRounds(participantIds, venue.courtCount);
    } else if (tournament.format === "mexicano") {
      const leaderboard = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournament_points", (q) => q.eq("tournamentId", args.tournamentId))
        .order("desc")
        .take(200);
      const rankedIds = leaderboard.map((e) => e.participantId as string);
      const rankedSet = new Set(rankedIds);
      const unranked = participantIds.filter((id) => !rankedSet.has(id));
      roundPlans = [generateMexicanoRound([...rankedIds, ...unranked], venue.courtCount)];
    } else {
      roundPlans = generateAmericanoRounds(participantIds, venue.courtCount);
    }

    const baseRoundNumber = existingRounds.length;
    for (let r = 0; r < roundPlans.length; r++) {
      const roundId = await ctx.db.insert("rounds", {
        tournamentId: args.tournamentId,
        roundNumber: baseRoundNumber + r + 1,
        state: "pending",
      });

      for (const match of roundPlans[r]) {
        const pairAId = await ctx.db.insert("pairs", {
          tournamentId: args.tournamentId,
          participantAId: match.pairA[0] as Id<"participants">,
          participantBId: match.pairA[1] as Id<"participants">,
        });

        const pairBId = await ctx.db.insert("pairs", {
          tournamentId: args.tournamentId,
          participantAId: match.pairB[0] as Id<"participants">,
          participantBId: match.pairB[1] as Id<"participants">,
        });

        await ctx.db.insert("matches", {
          roundId,
          courtNumber: match.courtNumber,
          pairAId,
          pairBId,
          state: "scheduled",
        });
      }
    }

    if (existingRounds.length === 0) {
      await ctx.db.patch(args.tournamentId, { state: "in_progress" });
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
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");
    if (round.state !== "pending") throw new Error("Round already started");
    await ctx.db.patch(args.roundId, { state: "in_progress" });
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
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");
    if (round.state !== "in_progress") throw new Error("Round not in progress");
    await ctx.db.patch(args.roundId, { state: "completed" });
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
