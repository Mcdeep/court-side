import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { generateAmericanoRounds } from "./formats/americano";
import { Id } from "./_generated/dataModel";

export const generate = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    if (tournament.format !== "americano") {
      throw new Error("Only Americano format supported in Phase 2");
    }

    const venue = await ctx.db.get(tournament.venueId);
    if (!venue) throw new Error("Venue not found");

    const existingRounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(1);
    if (existingRounds.length > 0) throw new Error("Rounds already generated for this tournament");

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
    const roundPlans = generateAmericanoRounds(participantIds, venue.courtCount);

    for (let r = 0; r < roundPlans.length; r++) {
      const roundId = await ctx.db.insert("rounds", {
        tournamentId: args.tournamentId,
        roundNumber: r + 1,
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

    await ctx.db.patch(args.tournamentId, { state: "in_progress" });
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
