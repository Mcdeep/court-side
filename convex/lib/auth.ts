import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) =>
      q.eq("clerkUserId", identity.tokenIdentifier)
    )
    .unique();
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await getUser(ctx);
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
  organizationId: Id<"organizations">
) {
  const user = await requireUser(ctx);
  if (user.isSuperAdmin) return { user, role: "admin" as const };

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const org = await ctx.db.get(organizationId);
  if (!org) throw new Error("Organisation not found");

  // Clerk's default session token (used when its `aud` claim is "convex")
  // encodes org membership as a compact `o: { id, slg, rol }` claim rather
  // than flat `org_id`/`org_role` fields used by custom JWT templates.
  const compactOrg = (identity as any).o as
    | { id?: string; rol?: string }
    | undefined;
  const clerkOrgId =
    ((identity as any).org_id as string | undefined) ?? compactOrg?.id;
  if (!clerkOrgId || clerkOrgId !== org.clerkOrgId) {
    throw new Error("Not a member of this organisation");
  }

  const role =
    ((identity as any).org_role as string | undefined) ?? compactOrg?.rol;
  return { user, role: role === "org:admin" ? "admin" as const : "member" as const };
}

// Any Clerk org member (org:member or org:admin) can manage tournaments.
// Clerk org:admin is reserved for Clerk-level management only.
export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
) {
  return requireOrgMember(ctx, organizationId);
}
