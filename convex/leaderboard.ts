import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getTournamentStandings } from "./lib/tournamentStandings";

export const get = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("participants"),
      participantId: v.id("participants"),
      participantIds: v.array(v.id("participants")),
      points: v.number(),
      wins: v.number(),
      losses: v.number(),
      played: v.number(),
      pointDiff: v.union(v.number(), v.null()),
      rank: v.number(),
      tied: v.boolean(),
      tiebreaksUnavailable: v.boolean(),
      group: v.optional(v.union(v.literal(1), v.literal(2))),
      groupRank: v.optional(v.number()),
      groupTied: v.optional(v.boolean()),
      finalPlacement: v.optional(v.number()),
      players: v.array(v.object({ displayName: v.string() })),
    }),
  ),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    return tournament ? getTournamentStandings(ctx, tournament) : [];
  },
});

export const recalculate = internalMutation({
  args: {
    matchId: v.id("matches"),
    scoreA: v.number(),
    scoreB: v.number(),
    // Set when re-scoring an already-completed match, so the prior
    // contribution can be reversed instead of double-counted.
    prevScoreA: v.optional(v.number()),
    prevScoreB: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    const round = await ctx.db.get(match.roundId);
    if (!round) return;

    const tournament = await ctx.db.get(round.tournamentId);
    if (tournament?.americanoVariant === "double" && round.stage === "final") return;
    if (tournament?.format === "snakes_and_ladders" && match.courtNumber !== 1) return;

    const pairA = await ctx.db.get(match.pairAId);
    const pairB = await ctx.db.get(match.pairBId);
    if (!pairA || !pairB) return;

    const differential = tournament?.leaderboardScoringMode === "differential";
    const hadPrev = args.prevScoreA !== undefined && args.prevScoreB !== undefined;
    const winnersA = args.scoreA > args.scoreB;
    const prevWinnersA = hadPrev && args.prevScoreA! > args.prevScoreB!;
    // "accumulate": each player's own score counts, win or lose.
    // "differential": the winning margin counts, positive for the winners
    // and negative for the losers (e.g. 6-3 -> +3 / -3).
    const pointsA = differential ? args.scoreA - args.scoreB : args.scoreA;
    const pointsB = differential ? args.scoreB - args.scoreA : args.scoreB;
    const prevPointsA = differential
      ? (args.prevScoreA ?? 0) - (args.prevScoreB ?? 0)
      : (args.prevScoreA ?? 0);
    const prevPointsB = differential
      ? (args.prevScoreB ?? 0) - (args.prevScoreA ?? 0)
      : (args.prevScoreB ?? 0);
    const participants = [
      {
        id: pairA.participantAId,
        won: winnersA,
        points: pointsA,
        prevWon: prevWinnersA,
        prevPoints: prevPointsA,
      },
      {
        id: pairA.participantBId,
        won: winnersA,
        points: pointsA,
        prevWon: prevWinnersA,
        prevPoints: prevPointsA,
      },
      {
        id: pairB.participantAId,
        won: !winnersA,
        points: pointsB,
        prevWon: hadPrev && !prevWinnersA,
        prevPoints: prevPointsB,
      },
      {
        id: pairB.participantBId,
        won: !winnersA,
        points: pointsB,
        prevWon: hadPrev && !prevWinnersA,
        prevPoints: prevPointsB,
      },
    ];

    for (const p of participants) {
      const existing = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournament_and_participant", (q) =>
          q.eq("tournamentId", round.tournamentId).eq("participantId", p.id as Id<"participants">),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          points: existing.points + p.points - (hadPrev ? p.prevPoints : 0),
          wins: existing.wins + (p.won ? 1 : 0) - (p.prevWon ? 1 : 0),
          losses: existing.losses + (p.won ? 0 : 1) - (hadPrev && !p.prevWon ? 1 : 0),
        });
      } else {
        await ctx.db.insert("leaderboard", {
          tournamentId: round.tournamentId,
          participantId: p.id as Id<"participants">,
          points: p.points,
          wins: p.won ? 1 : 0,
          losses: p.won ? 0 : 1,
        });
      }
    }
  },
});
