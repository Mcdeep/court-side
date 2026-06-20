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

  // Clerk JWT customClaims include org_id and org_role when user has active org
  const clerkOrgId = (identity as any).org_id as string | undefined;
  if (!clerkOrgId || clerkOrgId !== org.clerkOrgId) {
    throw new Error("Not a member of this organisation");
  }

  const role = (identity as any).org_role as string | undefined;
  return { user, role: role === "org:admin" ? "admin" as const : "member" as const };
}

export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
) {
  const result = await requireOrgMember(ctx, organizationId);
  if (result.role !== "admin") throw new Error("Admin access required");
  return result;
}
