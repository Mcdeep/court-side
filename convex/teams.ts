import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

export const listByTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);

    return teams.map((team) => ({
      ...team,
      members: participants
        .filter((p) => p.teamId === team._id)
        .sort((a, b) => a._creationTime - b._creationTime),
    }));
  },
});

// Fully replaces the tournament's team pairing: clears all existing teams
// and teamId assignments, then creates one team per pair. Only allowed
// before any rounds are generated — round_robin/knockout build their
// entire schedule from this pairing up front.
export const setPairs = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    pairs: v.array(v.array(v.id("participants"))),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await requireOrgAdmin(ctx, tournament.organizationId);

    const existingRounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(1);
    if (existingRounds.length > 0) {
      throw new Error("Reset the schedule before changing team pairing");
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);
    const participantIds = new Set(participants.map((p) => p._id as string));

    const seen = new Set<string>();
    for (const pair of args.pairs) {
      if (pair.length !== 2) throw new Error("Each team must have exactly 2 players");
      if (pair[0] === pair[1]) throw new Error("A player can't be paired with themselves");
      for (const id of pair) {
        if (!participantIds.has(id as string)) throw new Error("Unknown participant");
        if (seen.has(id as string)) throw new Error("A player can only be on one team");
        seen.add(id as string);
      }
    }

    const existingTeams = await ctx.db
      .query("teams")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);
    for (const team of existingTeams) await ctx.db.delete(team._id);
    for (const p of participants) {
      if (p.teamId !== undefined) await ctx.db.patch(p._id, { teamId: undefined });
    }

    let n = 1;
    for (const pair of args.pairs) {
      const teamId: Id<"teams"> = await ctx.db.insert("teams", {
        tournamentId: args.tournamentId,
        name: `Team ${n++}`,
      });
      for (const participantId of pair) {
        await ctx.db.patch(participantId, { teamId });
      }
    }
  },
});
