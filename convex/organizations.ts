import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './lib/auth'

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

export const suspend = mutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    await ctx.db.patch(args.organizationId, { status: 'suspended' })
  },
})
