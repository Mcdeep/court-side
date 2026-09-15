import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return ctx.db.get(userId);
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User profile not found — please reload");
  return user;
}

export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (!user.isSuperAdmin) throw new Error("Super admin access required");
  return user;
}

export async function requireOrgMember(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const user = await requireUser(ctx);
  if (user.isSuperAdmin) return { user, role: "admin" as const };

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_and_organization", (q) =>
      q.eq("userId", user._id).eq("organizationId", organizationId),
    )
    .unique();
  if (!membership) throw new Error("Not a member of this organisation");

  return { user, role: membership.role };
}

// Any org member (admin or member) can manage tournaments today — preserve
// that behavior rather than introducing a stricter admin-only gate.
export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  return requireOrgMember(ctx, organizationId);
}

// Lets a small set of write mutations (round generation/start/complete,
// score entry) be called either by a signed-in org member, or — for the
// PIN-gated /manage/:id page, which has no session — by anyone who
// supplies the tournament's current managePin.
export async function requireOrgAdminOrPin(
  ctx: QueryCtx | MutationCtx,
  tournament: { organizationId: Id<"organizations">; managePin?: string },
  pin?: string,
) {
  if (pin !== undefined) {
    if (!tournament.managePin || pin !== tournament.managePin) {
      throw new Error("Invalid PIN");
    }
    return;
  }
  await requireOrgAdmin(ctx, tournament.organizationId);
}
