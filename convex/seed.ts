import { mutation } from './_generated/server'
import { generateAmericanoRounds } from './formats/americano'
import type { Id } from './_generated/dataModel'

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
      courtCount: 4,
      state: 'registration_open',
      roundDurationMs: 4 * 60_000,
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

export const devStartRound = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', q => q.eq('slug', 'riverside-padel'))
      .unique()
    if (!org) throw new Error('Run devOrg first')

    const tournaments = await ctx.db
      .query('tournaments')
      .withIndex('by_organization', q => q.eq('organizationId', org._id))
      .take(1)
    const tournament = tournaments[0]
    if (!tournament) throw new Error('No tournament found')

    const existingRounds = await ctx.db
      .query('rounds')
      .withIndex('by_tournament', q => q.eq('tournamentId', tournament._id))
      .take(200)

    if (existingRounds.length === 0) {
      const participants = await ctx.db
        .query('participants')
        .withIndex('by_tournament', q => q.eq('tournamentId', tournament._id))
        .take(200)
      const ids = participants.map(p => p._id as string)
      const roundPlans = generateAmericanoRounds(ids, tournament.courtCount ?? 4)

      for (let r = 0; r < roundPlans.length; r++) {
        const roundId = await ctx.db.insert('rounds', {
          tournamentId: tournament._id,
          roundNumber: r + 1,
          state: 'pending',
        })
        for (const match of roundPlans[r]) {
          const pairAId = await ctx.db.insert('pairs', {
            tournamentId: tournament._id,
            participantAId: match.pairA[0] as Id<'participants'>,
            participantBId: match.pairA[1] as Id<'participants'>,
          })
          const pairBId = await ctx.db.insert('pairs', {
            tournamentId: tournament._id,
            participantAId: match.pairB[0] as Id<'participants'>,
            participantBId: match.pairB[1] as Id<'participants'>,
          })
          await ctx.db.insert('matches', {
            roundId,
            courtNumber: match.courtNumber,
            pairAId,
            pairBId,
            state: 'scheduled',
          })
        }
      }
      const managePin = String(Math.floor(1000 + Math.random() * 9000))
      await ctx.db.patch(tournament._id, { state: 'in_progress', managePin })
    }

    const rounds = await ctx.db
      .query('rounds')
      .withIndex('by_tournament', q => q.eq('tournamentId', tournament._id))
      .take(200)
    const pending = rounds.find(r => r.state === 'pending')
    if (pending) {
      await ctx.db.patch(pending._id, { state: 'in_progress', startedAt: Date.now() })
      const matches = await ctx.db
        .query('matches')
        .withIndex('by_round', q => q.eq('roundId', pending._id))
        .take(50)
      for (const m of matches) {
        if (m.state === 'scheduled') await ctx.db.patch(m._id, { state: 'in_progress' })
      }
      return { started: pending.roundNumber, tournamentId: tournament._id }
    }
    return { status: 'no pending rounds', tournamentId: tournament._id }
  },
})

// Dev-only. Wipes rounds/matches/scores/leaderboard for the seeded
// tournament and puts it back in registration_open so devStartRound can
// regenerate a fresh round (with a managePin) for local testing.
export const devReset = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', q => q.eq('slug', 'riverside-padel'))
      .unique()
    if (!org) throw new Error('Run devOrg first')
    const tournaments = await ctx.db
      .query('tournaments')
      .withIndex('by_organization', q => q.eq('organizationId', org._id))
      .take(1)
    const tournament = tournaments[0]
    if (!tournament) throw new Error('No tournament found')

    const rounds = await ctx.db
      .query('rounds')
      .withIndex('by_tournament', q => q.eq('tournamentId', tournament._id))
      .take(200)
    for (const round of rounds) {
      const matches = await ctx.db
        .query('matches')
        .withIndex('by_round', q => q.eq('roundId', round._id))
        .take(50)
      for (const match of matches) {
        const scores = await ctx.db
          .query('scores')
          .withIndex('by_match', q => q.eq('matchId', match._id))
          .take(50)
        for (const score of scores) await ctx.db.delete(score._id)
        await ctx.db.delete(match._id)
        await ctx.db.delete(match.pairAId)
        await ctx.db.delete(match.pairBId)
      }
      await ctx.db.delete(round._id)
    }
    const leaderboardEntries = await ctx.db
      .query('leaderboard')
      .withIndex('by_tournament', q => q.eq('tournamentId', tournament._id))
      .take(200)
    for (const entry of leaderboardEntries) await ctx.db.delete(entry._id)

    await ctx.db.patch(tournament._id, { state: 'registration_open' })
    return { tournamentId: tournament._id }
  },
})
