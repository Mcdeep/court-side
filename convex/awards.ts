import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { computeAwards, type EngineInput } from "./lib/awards";
import type { EngineMatch } from "./lib/awards/types";
import { getRecordedScore } from "./lib/recordedScore";
import { getRankingOrder } from "./lib/tiebreaks";
import { getTournamentStandings, usesLegacyStandings } from "./lib/tournamentStandings";
import { isDoubleAmericano } from "./lib/doubleAmericano";

const awardValidator = v.object({
  id: v.string(),
  title: v.string(),
  emoji: v.string(),
  winners: v.array(v.string()),
  detail: v.string(),
  short: v.string(),
});

// End-of-tournament awards for the kiosk finished screen. Public like
// leaderboard.get, which the kiosk already reads without auth.
export const forTournament = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(awardValidator),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.state !== "completed") return [];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .take(200);
    const players = await Promise.all(
      participants.map(async (p) => {
        const user = p.userId ? await ctx.db.get(p.userId) : null;
        return {
          id: p._id as string,
          name: user?.name ?? p.walkInName ?? "Unknown",
          ...(p.group !== undefined ? { group: p.group } : {}),
          ...(p.teamId ? { teamId: p.teamId as string } : {}),
        };
      }),
    );

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .take(1000);
    const matches: EngineMatch[] = [];
    for (const round of rounds) {
      const roundMatches = await ctx.db
        .query("matches")
        .withIndex("by_round", (q) => q.eq("roundId", round._id))
        .take(50);
      for (const match of roundMatches) {
        if (match.state !== "completed") continue;
        const score = getRecordedScore(match);
        if (!score) continue;
        const [pairA, pairB] = await Promise.all([
          ctx.db.get(match.pairAId),
          ctx.db.get(match.pairBId),
        ]);
        if (!pairA || !pairB) continue;
        matches.push({
          roundNumber: round.roundNumber,
          stage: round.stage ?? "group",
          ...(match.finalMatchIndex !== undefined ? { finalIndex: match.finalMatchIndex } : {}),
          court: match.courtNumber,
          pairA: [pairA.participantAId, pairA.participantBId],
          pairB: [pairB.participantAId, pairB.participantBId],
          ...score,
        });
      }
    }

    const standings = await getTournamentStandings(ctx, tournament);
    const input: EngineInput = {
      format: tournament.format,
      double: isDoubleAmericano(tournament),
      scoringMode: tournament.scoringMode,
      pointsToWin: tournament.pointsToWin,
      leaderboardScoringMode: tournament.leaderboardScoringMode,
      rankingOrder: await rankingOrder(ctx, tournament),
      players,
      matches,
      finalStandings: standings.map((row) => ({
        participantIds: row.participantIds.map(String),
        rank: row.rank,
        ...(row.groupRank !== undefined ? { groupRank: row.groupRank } : {}),
      })),
    };
    return computeAwards(input);
  },
});

// Mirrors getTournamentStandings: tiebreak-ranked only for non-legacy Americano.
async function rankingOrder(ctx: Parameters<typeof usesLegacyStandings>[0], t: Doc<"tournaments">) {
  if (t.format === "americano" && !(await usesLegacyStandings(ctx, t)))
    return getRankingOrder(t.tiebreakOrder);
  return ["points"] as const;
}
