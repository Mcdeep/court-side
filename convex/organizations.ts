import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser, requireOrgAdmin, requireSuperAdmin } from './lib/auth'

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('organizations')
      .withIndex('by_slug', q => q.eq('slug', args.slug))
      .unique()
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('organizations').order('asc').take(100)
  },
})

export const listWithStats = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').order('asc').take(200)
    return Promise.all(orgs.map(async (org) => {
      const [venues, tournaments] = await Promise.all([
        ctx.db.query('venues').withIndex('by_organization', q => q.eq('organizationId', org._id)).take(200),
        ctx.db.query('tournaments').withIndex('by_organization', q => q.eq('organizationId', org._id)).take(200),
      ])
      return {
        ...org,
        venueCount: venues.length,
        tournamentCount: tournaments.length,
        courtCount: venues.reduce((s, v) => s + v.courtCount, 0),
      }
    }))
  },
})

export const adminCreate = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    if (!args.name.trim()) throw new Error('Name required');
    if (!args.slug.trim()) throw new Error('Slug required');
    const existing = await ctx.db.query('organizations').withIndex('by_slug', q => q.eq('slug', args.slug.trim())).unique();
    if (existing) throw new Error('Slug already taken');
    return ctx.db.insert('organizations', {
      clerkOrgId: '',
      name: args.name.trim(),
      slug: args.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      status: 'active',
    })
  },
})

export const create = mutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.insert('organizations', {
      ...args,
      status: 'active',
    })
  },
})

export const update = mutation({
  args: {
    organizationId: v.id('organizations'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId);
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error('Organisation not found');
    if (!args.name.trim()) throw new Error('Name required');
    await ctx.db.patch(args.organizationId, { name: args.name.trim() });
  },
})

export const activate = mutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.organizationId, { status: 'active' });
  },
})

export const suspend = mutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.organizationId, { status: 'suspended' })
  },
})
