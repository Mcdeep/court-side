import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, requireOrgAdmin } from "./lib/auth";
import { doubleFinalsComplete } from "./lib/doubleAmericano";
import { getTournamentStandings } from "./lib/tournamentStandings";

const DEFAULT_TIERS = [10, 8, 6, 4, 3, 2];

export const getTiers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("ratingConfig")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    return config?.tiers ?? DEFAULT_TIERS;
  },
});

export const setTiers = mutation({
  args: {
    organizationId: v.id("organizations"),
    tiers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    if (args.tiers.length === 0) throw new Error("At least one tier required");
    for (const t of args.tiers) {
      if (t < 0) throw new Error("Tiers must be non-negative");
    }
    const existing = await ctx.db
      .query("ratingConfig")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { tiers: args.tiers });
    } else {
      await ctx.db.insert("ratingConfig", {
        organizationId: args.organizationId,
        tiers: args.tiers,
      });
    }
  },
});

const MIN_SKILL_RATING = 1;
const MAX_SKILL_RATING = 7;

export const setSkillRating = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    skillRating: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    if (args.skillRating < MIN_SKILL_RATING || args.skillRating > MAX_SKILL_RATING) {
      throw new Error(`Rating must be between ${MIN_SKILL_RATING} and ${MAX_SKILL_RATING}`);
    }

    const existing = await ctx.db
      .query("playerRatings")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { skillRating: args.skillRating });
    } else {
      await ctx.db.insert("playerRatings", {
        organizationId: args.organizationId,
        userId: args.userId,
        totalPoints: 0,
        tournamentsPlayed: 0,
        skillRating: args.skillRating,
      });
    }
  },
});

// Every roster member shows up here — linked or not — ranked purely by
// points accumulated in this org's own tournaments (playerRatings.totalPoints
// for a linked member, member.startingPoints as their running total
// otherwise; see ratings.awardRatings). Non-roster accounts with real
// tournament history in this org (added before the roster feature existed)
// are preserved too, so nobody with genuine history disappears.
export const getRankings = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(500);

    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_organization_and_points", (q) => q.eq("organizationId", args.organizationId))
      .take(200);
    const ratingByUserId = new Map(ratings.map((r) => [r.userId as string, r]));
    const coveredUserIds = new Set<string>();

    const rosterRows = await Promise.all(
      members.map(async (m) => {
        if (m.userId) {
          coveredUserIds.add(m.userId as string);
          const rating = ratingByUserId.get(m.userId as string);
          const user = await ctx.db.get(m.userId);
          return {
            _id: m._id as string,
            name: user?.name ?? m.name,
            email: user?.email ?? "",
            totalPoints: rating?.totalPoints ?? m.startingPoints ?? 0,
            tournamentsPlayed: rating?.tournamentsPlayed ?? 0,
          };
        }
        return {
          _id: m._id as string,
          name: m.name,
          email: "",
          totalPoints: m.startingPoints ?? 0,
          tournamentsPlayed: m.tournamentsPlayed ?? 0,
        };
      }),
    );

    const legacyRows = await Promise.all(
      ratings
        .filter((r) => !coveredUserIds.has(r.userId as string))
        .map(async (r) => {
          const user = await ctx.db.get(r.userId);
          return {
            _id: r._id as string,
            name: user?.name ?? "Unknown",
            email: user?.email ?? "",
            totalPoints: r.totalPoints,
            tournamentsPlayed: r.tournamentsPlayed,
          };
        }),
    );

    return [...rosterRows, ...legacyRows].sort((a, b) => b.totalPoints - a.totalPoints);
  },
});

export const getMyRankings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);

    return Promise.all(
      ratings.map(async (r) => {
        const org = await ctx.db.get(r.organizationId);
        return { ...r, clubName: org?.name ?? "Unknown" };
      }),
    );
  },
});

export const getPlayerHistory = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("ratingHistory")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId),
      )
      .order("desc")
      .take(50);

    return Promise.all(
      history.map(async (h) => {
        const tournament = await ctx.db.get(h.tournamentId);
        return {
          ...h,
          tournamentName: tournament?.name ?? "Unknown",
        };
      }),
    );
  },
});

export const awardRatings = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    const alreadyAwarded = await ctx.db
      .query("ratingHistory")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(200);
    if (
      alreadyAwarded.length > 0 &&
      (tournament.format !== "americano" ||
        !tournament.tiebreakOrder ||
        !tournament.awardedRatingTiers)
    )
      return null;

    const config = await ctx.db
      .query("ratingConfig")
      .withIndex("by_organization", (q) => q.eq("organizationId", tournament.organizationId))
      .unique();
    const tiers = tournament.awardedRatingTiers ?? config?.tiers ?? DEFAULT_TIERS;

    // An archived Double Americano may never have played its finals; score
    // corrections still schedule this job, so skip rather than fail it.
    if (!(await doubleFinalsComplete(ctx, tournament))) return null;
    const standings = await getTournamentStandings(ctx, tournament);
    if (!tournament.awardedRatingTiers)
      await ctx.db.patch(tournament._id, { awardedRatingTiers: tiers });
    const groups: { rank: number; units: typeof standings }[] = [];
    for (const unit of standings) {
      const last = groups[groups.length - 1];
      if (last?.rank === unit.rank) last.units.push(unit);
      else groups.push({ rank: unit.rank, units: [unit] });
    }

    // Assign tier points with tie averaging
    let position = 0;
    for (const group of groups) {
      const count = group.units.length;
      let totalTierPoints = 0;
      for (let i = 0; i < count; i++) {
        const tierIdx = position + i;
        totalTierPoints += tierIdx < tiers.length ? tiers[tierIdx] : 0;
      }
      const avgPoints = totalTierPoints / count;

      for (const participantId of group.units.flatMap((u) => u.participantIds)) {
        const participant = await ctx.db.get(participantId);
        if (!participant) continue;
        if (!participant.userId && !participant.memberId) continue;

        const placement = group.rank;
        const previous = alreadyAwarded.find((award) => award.participantId === participantId);
        const pointsChange = avgPoints - (previous?.pointsEarned ?? 0);
        const tournamentChange = previous ? 0 : 1;
        const member = participant.memberId ? await ctx.db.get(participant.memberId) : null;
        const userId = participant.userId ?? member?.userId;

        if (userId) {
          if (previous) await ctx.db.patch(previous._id, { placement, pointsEarned: avgPoints });
          else
            await ctx.db.insert("ratingHistory", {
              organizationId: tournament.organizationId,
              userId,
              participantId,
              tournamentId: args.tournamentId,
              placement,
              pointsEarned: avgPoints,
            });

          const existing = await ctx.db
            .query("playerRatings")
            .withIndex("by_organization_and_user", (q) =>
              q.eq("organizationId", tournament.organizationId).eq("userId", userId),
            )
            .unique();

          if (existing) {
            await ctx.db.patch(existing._id, {
              totalPoints: existing.totalPoints + pointsChange,
              tournamentsPlayed: existing.tournamentsPlayed + tournamentChange,
            });
          } else {
            await ctx.db.insert("playerRatings", {
              organizationId: tournament.organizationId,
              userId,
              totalPoints: avgPoints,
              tournamentsPlayed: 1,
            });
          }
        } else {
          // This participant was entered without a linked account —
          // accumulate directly on their member row instead of
          // playerRatings, which requires a linked account.
          if (!member) continue;

          if (previous) await ctx.db.patch(previous._id, { placement, pointsEarned: avgPoints });
          else
            await ctx.db.insert("ratingHistory", {
              organizationId: tournament.organizationId,
              memberId: participant.memberId,
              participantId,
              tournamentId: args.tournamentId,
              placement,
              pointsEarned: avgPoints,
            });

          await ctx.db.patch(member._id, {
            startingPoints: (member.startingPoints ?? 0) + pointsChange,
            tournamentsPlayed: (member.tournamentsPlayed ?? 0) + tournamentChange,
          });
        }
      }

      position += count;
    }
    return null;
  },
});
