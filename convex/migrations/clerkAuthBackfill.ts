import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * One-off migration: backfill data that used to live only in Clerk
 * (org membership/roles, and the identity link itself) into Convex, so
 * existing orgs/users survive the switch to @convex-dev/auth with no
 * data loss and no forced re-registration.
 *
 * Run order (see convex/schema.ts "WIDEN STEP" comments):
 *   1. Deploy the widened schema (this repo already has it) — adds
 *      authTables + memberships while keeping the legacy
 *      organizations.clerkOrgId / users.clerkUserId fields.
 *   2. `npx convex run migrations/clerkAuthBackfill:run --prod`
 *      Reads Clerk via CLERK_SECRET_KEY, and for every legacy org/user:
 *        - inserts a `memberships` row for every Clerk org membership
 *        - inserts an `authAccounts` row linking the EXISTING users._id
 *          to their Clerk-linked Google account (if any), or to a
 *          password account with no secret (if not) — see the module
 *          comment on backfillUser for why a secret-less password
 *          account is safe and sufficient.
 *      It only ever inserts new memberships/authAccounts rows; it never
 *      touches existing organizations/users documents. Safe to re-run —
 *      every insert is guarded by an existence check first.
 *   3. Verify: sign in as a migrated Google user (should just work) and
 *      as a migrated password user (use "Forgot password" once; the
 *      reset flow works because the pre-created authAccounts row
 *      exists, even with no secret — the reset flow doesn't check for
 *      one, only reset-verification (after code entry) sets it).
 *   4. Once verified, run `migrations/clerkAuthBackfill:stripLegacyFields`
 *      to remove clerkOrgId/clerkUserId from every document, then deploy
 *      the final narrow schema (drop the two fields from schema.ts).
 */

const CLERK_API = 'https://api.clerk.com/v1';

async function clerkFetch(path: string) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error('CLERK_SECRET_KEY not configured');
  const res = await fetch(`${CLERK_API}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    throw new Error(`Clerk API error (${res.status}) for ${path}: ${await res.text()}`);
  }
  return res.json();
}

// clerkUserId is stored as a full tokenIdentifier, e.g.
// "https://foo.clerk.accounts.dev|user_abc123" — see extractClerkUserId
// in the old convex/clerkActions.ts (removed by this branch).
function rawClerkUserId(clerkUserId: string): string {
  const parts = clerkUserId.split('|');
  const id = parts[parts.length - 1];
  if (!id?.startsWith('user_')) {
    throw new Error(`Cannot extract Clerk user ID from: ${clerkUserId}`);
  }
  return id;
}

export const legacyOrgs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect();
    return orgs.filter((o) => o.clerkOrgId !== undefined) as Array<{
      _id: Id<'organizations'>;
      clerkOrgId: string;
    }>;
  },
});

export const legacyUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.filter((u) => u.clerkUserId !== undefined) as Array<{
      _id: Id<'users'>;
      clerkUserId: string;
      email?: string;
    }>;
  },
});

export const recordAuthAccount = internalMutation({
  args: {
    userId: v.id('users'),
    provider: v.union(v.literal('google'), v.literal('password')),
    providerAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) =>
        q.eq('provider', args.provider).eq('providerAccountId', args.providerAccountId),
      )
      .unique();
    if (existing) return { status: 'skipped-exists' as const };

    await ctx.db.insert('authAccounts', {
      userId: args.userId,
      provider: args.provider,
      providerAccountId: args.providerAccountId,
    });
    return { status: 'inserted' as const };
  },
});

export const recordMembership = internalMutation({
  args: {
    userId: v.id('users'),
    organizationId: v.id('organizations'),
    role: v.union(v.literal('admin'), v.literal('member')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('memberships')
      .withIndex('by_user_and_organization', (q) =>
        q.eq('userId', args.userId).eq('organizationId', args.organizationId),
      )
      .unique();
    if (existing) return { status: 'skipped-exists' as const };

    await ctx.db.insert('memberships', {
      userId: args.userId,
      organizationId: args.organizationId,
      role: args.role,
    });
    return { status: 'inserted' as const };
  },
});

export const stripLegacyFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect();
    let orgsCleared = 0;
    for (const org of orgs) {
      if (org.clerkOrgId !== undefined) {
        await ctx.db.patch(org._id, { clerkOrgId: undefined });
        orgsCleared++;
      }
    }

    const users = await ctx.db.query('users').collect();
    let usersCleared = 0;
    for (const user of users) {
      if (user.clerkUserId !== undefined) {
        await ctx.db.patch(user._id, { clerkUserId: undefined });
        usersCleared++;
      }
    }

    return { orgsCleared, usersCleared };
  },
});

// Orchestrates the actual Clerk API reads. Run this once per environment
// (dev already has no Clerk data left; this matters for prod). Never
// writes anything it can't map — unmapped memberships/users are returned
// in the report for manual follow-up instead of being silently dropped.
export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.migrations.clerkAuthBackfill.legacyUsers, {});
    const orgs = await ctx.runQuery(internal.migrations.clerkAuthBackfill.legacyOrgs, {});

    const rawIdToUserId = new Map<string, Id<'users'>>();
    for (const u of users) rawIdToUserId.set(rawClerkUserId(u.clerkUserId), u._id);

    const userResults: Array<{ email?: string; result: string }> = [];
    for (const u of users) {
      const rawId = rawClerkUserId(u.clerkUserId);
      const clerkUser = await clerkFetch(`/users/${rawId}`);
      const googleAccount = (clerkUser.external_accounts as any[] | undefined)?.find(
        (a) => a.provider === 'oauth_google',
      );

      if (googleAccount?.provider_user_id) {
        const res = await ctx.runMutation(internal.migrations.clerkAuthBackfill.recordAuthAccount, {
          userId: u._id,
          provider: 'google',
          providerAccountId: googleAccount.provider_user_id,
        });
        userResults.push({ email: u.email, result: `google:${res.status}` });
      } else if (u.email) {
        const res = await ctx.runMutation(internal.migrations.clerkAuthBackfill.recordAuthAccount, {
          userId: u._id,
          provider: 'password',
          providerAccountId: u.email.toLowerCase(),
        });
        userResults.push({ email: u.email, result: `password:${res.status}` });
      } else {
        userResults.push({ email: u.email, result: 'unmapped-no-email-no-google' });
      }
    }

    const membershipResults: Array<{ org: string; rawUserId: string; result: string }> = [];
    for (const org of orgs) {
      const memberships = await clerkFetch(
        `/organizations/${org.clerkOrgId}/memberships?limit=100`,
      );
      for (const m of memberships.data as any[]) {
        const rawUserId = m.public_user_data?.user_id as string | undefined;
        if (!rawUserId) continue;
        const userId = rawIdToUserId.get(rawUserId);
        if (!userId) {
          membershipResults.push({
            org: org.clerkOrgId,
            rawUserId,
            result: 'unmapped-no-convex-user',
          });
          continue;
        }
        const role = m.role === 'org:admin' ? ('admin' as const) : ('member' as const);
        const res = await ctx.runMutation(internal.migrations.clerkAuthBackfill.recordMembership, {
          userId,
          organizationId: org._id,
          role,
        });
        membershipResults.push({ org: org.clerkOrgId, rawUserId, result: res.status });
      }
    }

    return { userResults, membershipResults };
  },
});
