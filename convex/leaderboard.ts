import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournament_points", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("desc")
      .take(100);

    return Promise.all(
      entries.map(async (entry) => {
        const participant = await ctx.db.get(entry.participantId);
        const user = participant?.userId
          ? await ctx.db.get(participant.userId)
          : null;
        return {
          ...entry,
          participant,
          user,
          displayName: user?.name ?? participant?.walkInName ?? "Unknown",
        };
      })
    );
  },
});

export const recalculate = internalMutation({
  args: {
    matchId: v.id("matches"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    const round = await ctx.db.get(match.roundId);
    if (!round) return;

    const pairA = await ctx.db.get(match.pairAId);
    const pairB = await ctx.db.get(match.pairBId);
    if (!pairA || !pairB) return;

    const winnersA = args.scoreA > args.scoreB;
    const participants = [
      { id: pairA.participantAId, won: winnersA, score: args.scoreA },
      { id: pairA.participantBId, won: winnersA, score: args.scoreA },
      { id: pairB.participantAId, won: !winnersA, score: args.scoreB },
      { id: pairB.participantBId, won: !winnersA, score: args.scoreB },
    ];

    for (const p of participants) {
      const existing = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournament_and_participant", (q) =>
          q.eq("tournamentId", round.tournamentId).eq("participantId", p.id as Id<"participants">)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          points: existing.points + p.score,
          wins: existing.wins + (p.won ? 1 : 0),
          losses: existing.losses + (p.won ? 0 : 1),
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
