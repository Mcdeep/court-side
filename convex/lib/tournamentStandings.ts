import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { rankStandings } from "./standings";
import type { StandingsMatch } from "./standings";
import { DEFAULT_TIEBREAK_ORDER } from "./tiebreaks";
import { getRecordedScore } from "./recordedScore";

const FIXED_PAIR_FORMATS = ["round_robin", "knockout", "king_of_the_court", "snakes_and_ladders"];

export async function hasRatingAwards(ctx: Pick<QueryCtx, "db">, tournament: Doc<"tournaments">) {
  return Boolean(tournament.awardedRatingTiers || await ctx.db.query("ratingHistory")
    .withIndex("by_tournament", q => q.eq("tournamentId", tournament._id)).first());
}

export async function usesLegacyStandings(ctx: Pick<QueryCtx, "db">, tournament: Doc<"tournaments">) {
  return !tournament.tiebreakOrder && (tournament.tiebreakOrderLocked || tournament.state === "completed" || tournament.state === "archived" || await hasRatingAwards(ctx, tournament));
}

export async function withTiebreakLock(ctx: Pick<QueryCtx, "db">, tournament: Doc<"tournaments">) {
  return { ...tournament, tiebreakOrderLocked: Boolean(tournament.tiebreakOrderLocked || tournament.state === "completed" || tournament.state === "archived" || await hasRatingAwards(ctx, tournament)) };
}

export async function getTournamentStandings(ctx: Pick<QueryCtx, "db">, tournament: Doc<"tournaments">) {
  const participants = await ctx.db.query("participants")
    .withIndex("by_tournament", q => q.eq("tournamentId", tournament._id)).take(200);
  const participantById = new Map(participants.map(p => [p._id, p]));
  const isAmericano = tournament.format === "americano";
  const useTiebreaks = isAmericano && !await usesLegacyStandings(ctx, tournament);
  let tiebreaksUnavailable = false;
  const matches: StandingsMatch[] = [];
  const totals = new Map<Id<"participants">, { points: number; wins: number; losses: number }>();

  if (useTiebreaks) {
    const rounds = await ctx.db.query("rounds")
      .withIndex("by_tournament", q => q.eq("tournamentId", tournament._id)).take(1001);
    if (rounds.length > 1000) throw new Error("Too many rounds to calculate tournament standings");
    const roundMatches = await Promise.all(rounds.map(round => ctx.db.query("matches")
      .withIndex("by_round", q => q.eq("roundId", round._id)).take(50)));
    for (const match of roundMatches.flat()) {
      if (match.state !== "completed") continue;
      const score = getRecordedScore(match);
      if (!score) { tiebreaksUnavailable = true; continue; }
      const [a, b] = await Promise.all([ctx.db.get(match.pairAId), ctx.db.get(match.pairBId)]);
      if (!a || !b) { tiebreaksUnavailable = true; continue; }
      const pairA = [a.participantAId, a.participantBId];
      const pairB = [b.participantAId, b.participantBId];
      matches.push({ pairA, pairB, ...score });
      for (const [ids, scoreFor, against] of [[pairA, score.scoreA, score.scoreB], [pairB, score.scoreB, score.scoreA]] as const) {
        for (const id of ids) {
          const stats = totals.get(id) ?? { points: 0, wins: 0, losses: 0 };
          stats.points += scoreFor;
          stats.wins += Number(scoreFor > against);
          stats.losses += Number(scoreFor < against);
          totals.set(id, stats);
        }
      }
    }
  }
  if (!useTiebreaks || tiebreaksUnavailable) {
    totals.clear();
    matches.length = 0;
    const entries = await ctx.db.query("leaderboard")
      .withIndex("by_tournament", q => q.eq("tournamentId", tournament._id)).take(200);
    for (const entry of entries) totals.set(entry.participantId, entry);
  }

  const names = new Map(await Promise.all(participants.map(async p => {
    const user = p.userId ? await ctx.db.get(p.userId) : null;
    return [p._id, user?.name ?? p.walkInName ?? "Unknown"] as const;
  })));
  const rows = [...totals].map(([participantId, stats]) => ({
    _id: participantId,
    participantId,
    participantIds: [participantId],
    points: stats.points,
    wins: stats.wins,
    losses: stats.losses,
    players: [{ displayName: names.get(participantId) ?? "Unknown" }],
  }));

  const units: typeof rows = [];
  const byTeam = new Map<Id<"teams">, typeof rows[number]>();
  for (const row of rows) {
    const teamId = FIXED_PAIR_FORMATS.includes(tournament.format) ? participantById.get(row.participantId)?.teamId : undefined;
    const team = teamId ? byTeam.get(teamId) : undefined;
    if (team) {
      team.participantIds.push(row.participantId);
      team.players.push(...row.players);
    } else {
      if (teamId) byTeam.set(teamId, row);
      units.push(row);
    }
  }
  const ranked = useTiebreaks && !tiebreaksUnavailable;
  return rankStandings(units, matches, ranked ? tournament.tiebreakOrder ?? DEFAULT_TIEBREAK_ORDER : [])
    .map(row => ({ ...row, pointDiff: ranked ? row.pointDiff : null, tiebreaksUnavailable }));
}
