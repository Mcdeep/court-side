import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

async function clerkFetch(path: string, options: RequestInit = {}) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("CLERK_SECRET_KEY not configured");
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clerk API error (${res.status}): ${body}`);
  }
  return res.json();
}

function extractClerkUserId(tokenIdentifier: string): string {
  const parts = tokenIdentifier.split("|");
  const userId = parts[parts.length - 1];
  if (!userId?.startsWith("user_")) {
    throw new Error(`Cannot extract Clerk user ID from: ${tokenIdentifier}`);
  }
  return userId;
}

// ─── Internal helpers (called by actions) ───

export const verifySuperAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.tokenIdentifier)
      )
      .unique();
    if (!user?.isSuperAdmin) throw new Error("Super admin access required");
    return user;
  },
});

export const insertOrg = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Slug already taken");
    return ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      status: "active",
    });
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const patchOrgClerkId = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, { clerkOrgId: args.clerkOrgId });
  },
});

export const getOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.organizationId);
  },
});

// ─── Public actions ───

export const adminCreateOrg = action({
  args: {
    name: v.string(),
    slug: v.string(),
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.clerkAdmin.verifySuperAdmin);

    if (!args.name.trim()) throw new Error("Name required");
    if (!args.slug.trim()) throw new Error("Slug required");

    const slug = args.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const isDev = !process.env.CONVEX_CLOUD_URL?.includes(".convex.cloud");
    const clerkSlug = isDev ? `dev-${slug}` : slug;

    const clerkOrg = await clerkFetch("/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: isDev ? `[DEV] ${args.name.trim()}` : args.name.trim(),
        slug: clerkSlug,
        created_by: "system",
      }),
    });

    const orgId: Id<"organizations"> = await ctx.runMutation(
      internal.clerkAdmin.insertOrg,
      {
        clerkOrgId: clerkOrg.id,
        name: args.name.trim(),
        slug,
      }
    );

    if (args.adminUserId) {
      const user = await ctx.runQuery(internal.clerkAdmin.getUser, {
        userId: args.adminUserId,
      });
      if (user) {
        const clerkUserId = extractClerkUserId(user.clerkUserId);
        await clerkFetch(`/organizations/${clerkOrg.id}/memberships`, {
          method: "POST",
          body: JSON.stringify({
            user_id: clerkUserId,
            role: "org:member",
          }),
        });
      }
    }

    return orgId;
  },
});

export const assignOrgAdmin = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.clerkAdmin.verifySuperAdmin);

    const org = await ctx.runQuery(internal.clerkAdmin.getOrg, {
      organizationId: args.organizationId,
    });
    if (!org) throw new Error("Organisation not found");
    if (!org.clerkOrgId) throw new Error("Organisation has no Clerk org linked");

    const user = await ctx.runQuery(internal.clerkAdmin.getUser, {
      userId: args.userId,
    });
    if (!user) throw new Error("User not found");

    const clerkUserId = extractClerkUserId(user.clerkUserId);
    await clerkFetch(`/organizations/${org.clerkOrgId}/memberships`, {
      method: "POST",
      body: JSON.stringify({
        user_id: clerkUserId,
        role: "org:member",
      }),
    });
  },
});
