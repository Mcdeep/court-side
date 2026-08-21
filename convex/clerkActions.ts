"use node";

import { action } from "./_generated/server";
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

export const adminCreateOrg = action({
  args: {
    name: v.string(),
    slug: v.string(),
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const superAdmin = await ctx.runQuery(internal.clerkAdmin.verifySuperAdmin);

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
        created_by: extractClerkUserId(superAdmin.clerkUserId),
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

export const listOrgAdmins = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.clerkAdmin.verifySuperAdmin);

    const org = await ctx.runQuery(internal.clerkAdmin.getOrg, {
      organizationId: args.organizationId,
    });
    if (!org) throw new Error("Organisation not found");
    if (!org.clerkOrgId) return [];

    const result = await clerkFetch(
      `/organizations/${org.clerkOrgId}/memberships?limit=100`
    );

    return (result.data as any[]).map((m) => ({
      clerkUserId: m.public_user_data?.user_id as string,
      name: [m.public_user_data?.first_name, m.public_user_data?.last_name]
        .filter(Boolean)
        .join(" ") || m.public_user_data?.identifier,
      email: m.public_user_data?.identifier as string,
      role: m.role as string,
    }));
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
