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

    const hadPrev = args.prevScoreA !== undefined && args.prevScoreB !== undefined;
    const winnersA = args.scoreA > args.scoreB;
    const prevWinnersA = hadPrev && args.prevScoreA! > args.prevScoreB!;
    const participants = [
      {
        id: pairA.participantAId,
        won: winnersA,
        score: args.scoreA,
        prevWon: prevWinnersA,
        prevScore: args.prevScoreA ?? 0,
      },
      {
        id: pairA.participantBId,
        won: winnersA,
        score: args.scoreA,
        prevWon: prevWinnersA,
        prevScore: args.prevScoreA ?? 0,
      },
      {
        id: pairB.participantAId,
        won: !winnersA,
        score: args.scoreB,
        prevWon: hadPrev && !prevWinnersA,
        prevScore: args.prevScoreB ?? 0,
      },
      {
        id: pairB.participantBId,
        won: !winnersA,
        score: args.scoreB,
        prevWon: hadPrev && !prevWinnersA,
        prevScore: args.prevScoreB ?? 0,
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
          points: existing.points + p.score - (hadPrev ? p.prevScore : 0),
          wins: existing.wins + (p.won ? 1 : 0) - (p.prevWon ? 1 : 0),
          losses: existing.losses + (p.won ? 0 : 1) - (hadPrev && !p.prevWon ? 1 : 0),
        });
      } else {
        await ctx.db.insert("leaderboard", {
          tournamentId: round.tournamentId,
          participantId: p.id as Id<"participants">,
          points: p.score,
          wins: p.won ? 1 : 0,
          losses: p.won ? 0 : 1,
        });
      }
    }
  },
});
