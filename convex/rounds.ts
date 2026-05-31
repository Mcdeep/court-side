import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { generateAmericanoRounds } from "./formats/americano";
import { generateRoundRobinRounds } from "./formats/round_robin";
import { generateMexicanoRound } from "./formats/mexicano";
import { generateKnockoutFirstRound, generateKnockoutNextRound } from "./formats/knockout";
import { generateKingFirstRound, generateKingNextRound } from "./formats/king_of_the_court";
import { Id } from "./_generated/dataModel";

export const generate = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const supported = ["americano", "round_robin", "mexicano", "knockout", "king_of_the_court"];
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
    if (["mexicano", "knockout", "king_of_the_court"].includes(tournament.format) && existingRounds.length > 0) {
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
    } else if (tournament.format === "knockout") {
      if (existingRounds.length === 0) {
        roundPlans = [generateKnockoutFirstRound(participantIds, venue.courtCount)];
      } else {
        const lastRound = existingRounds[existingRounds.length - 1];
        const lastMatches = await ctx.db
          .query("matches")
          .withIndex("by_round", (q) => q.eq("roundId", lastRound._id))
          .take(50);
        lastMatches.sort((a, b) => a.courtNumber - b.courtNumber);

        const winnerPairs: [string, string][] = [];
        for (const match of lastMatches) {
          if (match.scoreA === undefined || match.scoreB === undefined) {
            throw new Error("Not all matches in the previous round have scores");
          }
          const winnerPairId = match.scoreA >= match.scoreB ? match.pairAId : match.pairBId;
          const pair = await ctx.db.get(winnerPairId);
          if (!pair) throw new Error("Pair not found");
          winnerPairs.push([pair.participantAId as string, pair.participantBId as string]);
        }
        roundPlans = [generateKnockoutNextRound(winnerPairs, venue.courtCount)];
      }
    } else if (tournament.format === "king_of_the_court") {
      if (existingRounds.length === 0) {
        roundPlans = [generateKingFirstRound(participantIds, venue.courtCount)];
      } else {
        // Track the last round each participant appeared in (for queue ordering).
        const lastRoundPlayed = new Map<string, number>();
        for (const round of existingRounds) {
          const matches = await ctx.db
            .query("matches")
            .withIndex("by_round", (q) => q.eq("roundId", round._id))
            .take(50);
          await Promise.all(matches.map(async (match) => {
            const [pA, pB] = await Promise.all([ctx.db.get(match.pairAId), ctx.db.get(match.pairBId)]);
            for (const p of [pA, pB]) {
              if (!p) return;
              for (const pid of [p.participantAId as string, p.participantBId as string]) {
                if ((lastRoundPlayed.get(pid) ?? 0) < round.roundNumber) {
                  lastRoundPlayed.set(pid, round.roundNumber);
                }
              }
            }
          }));
        }

        // Current kings = winners of last round (sorted by courtNumber).
        const lastRound = existingRounds[existingRounds.length - 1];
        const lastMatches = await ctx.db
          .query("matches")
          .withIndex("by_round", (q) => q.eq("roundId", lastRound._id))
          .take(50);
        lastMatches.sort((a, b) => a.courtNumber - b.courtNumber);

        const currentKings: [string, string][] = [];
        for (const match of lastMatches) {
          if (match.scoreA === undefined || match.scoreB === undefined) {
            throw new Error("Not all matches in the previous round have scores");
          }
          const [pA, pB] = await Promise.all([ctx.db.get(match.pairAId), ctx.db.get(match.pairBId)]);
          if (!pA || !pB) throw new Error("Pair not found");
          const winner = match.scoreA >= match.scoreB
            ? [pA.participantAId as string, pA.participantBId as string]
            : [pB.participantAId as string, pB.participantBId as string];
          currentKings.push([winner[0], winner[1]]);
        }

        // Queue = non-kings, sorted by lastRoundPlayed ascending (longest waiting first).
        const kingIds = new Set(currentKings.flat());
        const queueIds = participantIds
          .filter((id) => !kingIds.has(id))
          .sort((a, b) => (lastRoundPlayed.get(a) ?? 0) - (lastRoundPlayed.get(b) ?? 0));

        const challengers: [string, string][] = [];
        for (let i = 0; i + 1 < queueIds.length && challengers.length < currentKings.length; i += 2) {
          challengers.push([queueIds[i], queueIds[i + 1]]);
        }

        roundPlans = [generateKingNextRound(currentKings, challengers, venue.courtCount)];
      }
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
