import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "./lib/auth";

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
