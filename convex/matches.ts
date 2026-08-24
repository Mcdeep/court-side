import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const listByRound = query({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .take(50);

    return Promise.all(
      matches.map(async (match) => {
        const [pairA, pairB] = await Promise.all([
          ctx.db.get(match.pairAId),
          ctx.db.get(match.pairBId),
        ]);

        const [pA1, pA2, pB1, pB2] = await Promise.all([
          pairA ? ctx.db.get(pairA.participantAId) : null,
          pairA ? ctx.db.get(pairA.participantBId) : null,
          pairB ? ctx.db.get(pairB.participantAId) : null,
          pairB ? ctx.db.get(pairB.participantBId) : null,
        ]);

        const resolveParticipant = async (p: typeof pA1) => {
          if (!p) return null;
          const user = p.userId ? await ctx.db.get(p.userId) : null;
          return { ...p, user };
        };

        return {
          ...match,
          pairA: {
            ...pairA,
            participantA: await resolveParticipant(pA1),
            participantB: await resolveParticipant(pA2),
          },
          pairB: {
            ...pairB,
            participantA: await resolveParticipant(pB1),
            participantB: await resolveParticipant(pB2),
          },
        };
      })
    );
  },
});

export const historyByTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .order("asc")
      .take(200);

    const resolveTeam = async (pairId: Id<"pairs">) => {
      const pair = await ctx.db.get(pairId);
      if (!pair) return [];
      const [pA, pB] = await Promise.all([
        ctx.db.get(pair.participantAId),
        ctx.db.get(pair.participantBId),
      ]);
      const withName = async (p: typeof pA) => {
        if (!p) return null;
        const user = p.userId ? await ctx.db.get(p.userId) : null;
        return { participantId: p._id, name: user?.name ?? p.walkInName ?? "Unknown" };
      };
      const [a, b] = await Promise.all([withName(pA), withName(pB)]);
      return [a, b].filter((p): p is NonNullable<typeof a> => p !== null);
    };

    const results = [];
    for (const round of rounds) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .take(50);
      for (const match of matches) {
        if (match.scoreA === undefined || match.scoreB === undefined) continue;
        const [teamA, teamB] = await Promise.all([
          resolveTeam(match.pairAId),
          resolveTeam(match.pairBId),
        ]);
        results.push({
          roundNumber: round.roundNumber,
          courtNumber: match.courtNumber,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          teamA,
          teamB,
        });
      }
    }
    return results;
  },
});

export const updateState = mutation({
  args: {
    matchId: v.id("matches"),
    state: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("score_pending"),
      v.literal("completed"),
      v.literal("disputed"),
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    const round = await ctx.db.get(match.roundId);
    if (!round) throw new Error("Round not found");
    const tournament = await ctx.db.get(round.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);
    await ctx.db.patch(args.matchId, { state: args.state });
  },
});
