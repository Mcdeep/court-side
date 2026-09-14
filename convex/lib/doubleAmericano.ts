import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export const americanoVariantValidator = v.union(v.literal("single"), v.literal("double"));
export const groupSplitModeValidator = v.union(v.literal("random"), v.literal("top_bottom"), v.literal("balanced"));
export const groupValidator = v.union(v.literal(1), v.literal(2));
export const isDoubleAmericano = (tournament: Pick<Doc<"tournaments">, "format" | "americanoVariant">) => tournament.format === "americano" && tournament.americanoVariant === "double";

export async function participantSkillRating(ctx: Pick<QueryCtx, "db">, participant: Doc<"participants">, organizationId: Id<"organizations">) {
  const member = participant.memberId ? await ctx.db.get(participant.memberId) : null;
  const userId = member?.userId ?? participant.userId;
  if (userId) {
    const rating = await ctx.db.query("playerRatings").withIndex("by_organization_and_user", q => q.eq("organizationId", organizationId).eq("userId", userId)).unique();
    return rating?.skillRating;
  }
  return member ? member.skillRating : participant.skillRating;
}

export async function assertDoubleFinalsComplete(ctx: Pick<QueryCtx, "db">, tournament: Doc<"tournaments">) {
  if (!isDoubleAmericano(tournament)) return;
  const rounds = await ctx.db.query("rounds").withIndex("by_tournament", q => q.eq("tournamentId", tournament._id)).take(200);
  const finals = rounds.filter(round => round.stage === "final");
  const matches = (await Promise.all(finals.map(round => ctx.db.query("matches").withIndex("by_round", q => q.eq("roundId", round._id)).take(50)))).flat();
  if (!finals.length || rounds.some(round => round.state !== "completed") || matches.length !== 4 ||
    new Set(matches.map(match => match.finalMatchIndex)).size !== 4 ||
    matches.some(match => match.finalMatchIndex === undefined || match.finalMatchIndex < 0 || match.finalMatchIndex > 3 || match.state !== "completed" || match.scoreA === undefined || match.scoreB === undefined || match.scoreA === match.scoreB)) {
    throw new Error("Complete and score all crossover finals before finishing the tournament");
  }
}

export async function assertGroupResultsEditable(ctx: Pick<QueryCtx, "db">, tournament: Doc<"tournaments">, round: Doc<"rounds">) {
  if (!isDoubleAmericano(tournament) || round.stage !== "group") return;
  const rounds = await ctx.db.query("rounds").withIndex("by_tournament", q => q.eq("tournamentId", tournament._id)).take(200);
  if (rounds.some(candidate => candidate.stage === "final")) throw new Error("Group results are locked. Reset crossover finals before changing a group result.");
}
