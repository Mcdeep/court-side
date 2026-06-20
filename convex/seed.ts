import { mutation } from './_generated/server'

/**
 * Dev-only seed. Run once from the Convex dashboard:
 *   Functions → seed → devOrg → Run
 *
 * Creates: 1 org, 1 venue, 16 placeholder participants on a draft tournament.
 * Safe to run multiple times — checks for existing slug first.
 */
export const devOrg = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_slug', q => q.eq('slug', 'riverside-padel'))
      .unique()

    if (existing) return { status: 'already seeded', orgId: existing._id }

    const orgId = await ctx.db.insert('organizations', {
      clerkOrgId: 'dev_org_riverside',
      name: 'Riverside Padel Club',
      slug: 'riverside-padel',
      status: 'active',
    })

    const venueId = await ctx.db.insert('venues', {
      organizationId: orgId,
      name: 'Riverside — Indoor',
      courtCount: 4,
    })

    const tournamentId = await ctx.db.insert('tournaments', {
      organizationId: orgId,
      venueId,
      name: 'Spring Americano',
      format: 'americano',
      state: 'registration_open',
      startsAt: Date.now(),
      endsAt: Date.now() + 1000 * 60 * 60 * 3,
    })

    const PLAYERS = [
      'Marco Rossi', 'Luca Bianchi', 'Diego Torres', 'Pablo Núñez',
      'Sofia Vega', 'Elena Ruiz', 'Ana Costa', 'Maya Lind',
      'Tom Berg', 'Jon Reyes', 'Kai Persson', 'Noah Frank',
      'Liam Walsh', 'Omar Haddad', 'Yuki Sato', 'Ravi Patel',
    ]

    for (const name of PLAYERS) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: `dev_user_${name.toLowerCase().replace(/\s/g, '_')}`,
        name,
        email: `${name.toLowerCase().replace(/\s/g, '.')}@dev.test`,
      })
      await ctx.db.insert('participants', {
        tournamentId,
        userId,
        entryType: 'solo',
        isWalkIn: false,
      })
    }

    return { status: 'seeded', orgId, venueId, tournamentId }
  },
})
