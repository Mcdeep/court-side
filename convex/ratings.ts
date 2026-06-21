import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAdmin } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

const DEFAULT_TIERS = [10, 8, 6, 4, 3, 2];

export const getTiers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("ratingConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
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
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
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

export const getRankings = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_organization_and_points", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(200);

    return Promise.all(
      ratings.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          ...r,
          name: user?.name ?? "Unknown",
          email: user?.email ?? "",
        };
      })
    );
  },
});

export const getMyRankings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return [];

    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);

    return Promise.all(
      ratings.map(async (r) => {
        const org = await ctx.db.get(r.organizationId);
        return { ...r, clubName: org?.name ?? "Unknown" };
      })
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
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
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
      })
    );
  },
});

export const awardRatings = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return;

    const alreadyAwarded = await ctx.db
      .query("ratingHistory")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .take(1);
    if (alreadyAwarded.length > 0) return;

    const config = await ctx.db
      .query("ratingConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", tournament.organizationId)
      )
      .unique();
    const tiers = config?.tiers ?? DEFAULT_TIERS;

    const standings = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournament_points", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("desc")
      .take(200);

    if (standings.length === 0) return;

    // Group by points to handle ties
    const groups: { points: number; participantIds: Id<"participants">[] }[] = [];
    for (const entry of standings) {
      const last = groups[groups.length - 1];
      if (last && last.points === entry.points) {
        last.participantIds.push(entry.participantId);
      } else {
        groups.push({ points: entry.points, participantIds: [entry.participantId] });
      }
    }

    // Assign tier points with tie averaging
    let position = 0;
    for (const group of groups) {
      const count = group.participantIds.length;
      let totalTierPoints = 0;
      for (let i = 0; i < count; i++) {
        const tierIdx = position + i;
        totalTierPoints += tierIdx < tiers.length ? tiers[tierIdx] : 0;
      }
      const avgPoints = totalTierPoints / count;

      for (const participantId of group.participantIds) {
        const participant = await ctx.db.get(participantId);
        if (!participant || !participant.userId) continue;

        const placement = position + 1;

        await ctx.db.insert("ratingHistory", {
          organizationId: tournament.organizationId,
          userId: participant.userId,
          tournamentId: args.tournamentId,
          placement,
          pointsEarned: avgPoints,
        });

        const existing = await ctx.db
          .query("playerRatings")
          .withIndex("by_organization_and_user", (q) =>
            q
              .eq("organizationId", tournament.organizationId)
              .eq("userId", participant.userId!)
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, {
            totalPoints: existing.totalPoints + avgPoints,
            tournamentsPlayed: existing.tournamentsPlayed + 1,
          });
        } else {
          await ctx.db.insert("playerRatings", {
            organizationId: tournament.organizationId,
            userId: participant.userId,
            totalPoints: avgPoints,
            tournamentsPlayed: 1,
          });
        }
      }

      position += count;
    }
  },
});
