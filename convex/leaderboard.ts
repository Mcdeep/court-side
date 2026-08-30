import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Formats where partners are fixed for the whole tournament (mirrors
// convex/rounds.ts and src/lib/constants.ts) -- both partners always play
// every match together, so they always carry identical points/wins/losses
// and should show as a single team row rather than two individual rows.
const FIXED_PAIR_FORMATS = ["round_robin", "knockout", "king_of_the_court", "snakes_and_ladders"];

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

    const resolved = await Promise.all(
      entries.map(async (entry) => {
        const participant = await ctx.db.get(entry.participantId);
        const user = participant?.userId
          ? await ctx.db.get(participant.userId)
          : null;
        return {
          entry,
          participant,
          displayName: user?.name ?? participant?.walkInName ?? "Unknown",
        };
      })
    );

    const tournament = await ctx.db.get(args.tournamentId);
    const isTeamFormat = !!tournament && FIXED_PAIR_FORMATS.includes(tournament.format);

    const toRow = (entry: Doc<"leaderboard">, players: { displayName: string }[]) => ({
      _id: entry._id,
      points: entry.points,
      wins: entry.wins,
      losses: entry.losses,
      players,
    });

    if (!isTeamFormat) {
      return resolved.map((r) => toRow(r.entry, [{ displayName: r.displayName }]));
    }

    // Group both partners of a team into one row. Their points/wins/losses
    // are identical by construction (they always play together), so just
    // keep the first entry's stats and combine the display names.
    const byTeam = new Map<string, typeof resolved>();
    const solo: typeof resolved = [];
    for (const r of resolved) {
      const teamId = r.participant?.teamId as string | undefined;
      if (!teamId) { solo.push(r); continue; }
      const group = byTeam.get(teamId) ?? [];
      group.push(r);
      byTeam.set(teamId, group);
    }

    const rows = [
      ...[...byTeam.values()].map((group) => toRow(group[0].entry, group.map((r) => ({ displayName: r.displayName })))),
      ...solo.map((r) => toRow(r.entry, [{ displayName: r.displayName }])),
    ];

    return rows.sort((a, b) => b.points - a.points);
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
    if (tournament?.format === "snakes_and_ladders" && match.courtNumber !== 1) return;

    const pairA = await ctx.db.get(match.pairAId);
    const pairB = await ctx.db.get(match.pairBId);
    if (!pairA || !pairB) return;

    const hadPrev = args.prevScoreA !== undefined && args.prevScoreB !== undefined;
    const winnersA = args.scoreA > args.scoreB;
    const prevWinnersA = hadPrev && args.prevScoreA! > args.prevScoreB!;
    const participants = [
      { id: pairA.participantAId, won: winnersA, score: args.scoreA, prevWon: prevWinnersA, prevScore: args.prevScoreA ?? 0 },
      { id: pairA.participantBId, won: winnersA, score: args.scoreA, prevWon: prevWinnersA, prevScore: args.prevScoreA ?? 0 },
      { id: pairB.participantAId, won: !winnersA, score: args.scoreB, prevWon: hadPrev && !prevWinnersA, prevScore: args.prevScoreB ?? 0 },
      { id: pairB.participantBId, won: !winnersA, score: args.scoreB, prevWon: hadPrev && !prevWinnersA, prevScore: args.prevScoreB ?? 0 },
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
