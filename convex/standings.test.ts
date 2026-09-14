/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from 'vitest'
import { convexTest } from 'convex-test'
import { api, internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob(['./**/*.ts', './_generated/*.js', '!./**/*.test.ts'])
afterEach(() => vi.useRealTimers())

async function setup() {
  const t = convexTest(schema, modules)
  const data = await t.run(async ctx => {
    const organizationId = await ctx.db.insert('organizations', { clerkOrgId: 'club', name: 'Club', slug: 'club', status: 'active' })
    const venueId = await ctx.db.insert('venues', { organizationId, name: 'Courts', courtCount: 2 })
    await ctx.db.insert('users', { clerkUserId: 'organizer', name: 'Organizer', email: 'organizer@example.test' })
    await ctx.db.insert('users', { clerkUserId: 'outsider', name: 'Outsider', email: 'outsider@example.test' })
    return { organizationId, venueId }
  })
  const organizer = t.withIdentity({ tokenIdentifier: 'organizer', org_id: 'club', org_role: 'org:admin' })
  const tournamentId = await organizer.mutation(api.tournaments.create, {
    ...data, name: 'Americano', format: 'americano', startsAt: 0, endsAt: 1000,
  })
  const participants = await t.run(async ctx => {
    const ids = []
    for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const memberId = await ctx.db.insert('members', { organizationId: data.organizationId, name })
      const id = await ctx.db.insert('participants', { tournamentId, memberId, isWalkIn: true, walkInName: name, entryType: 'solo' })
      ids.push(id)
    }
    return ids
  })
  async function addMatch(a: number[], b: number[]) {
    return t.run(async ctx => {
      const roundId = await ctx.db.insert('rounds', { tournamentId, roundNumber: 1, state: 'completed' })
      const pairAId = await ctx.db.insert('pairs', { tournamentId, participantAId: participants[a[0]], participantBId: participants[a[1]] })
      const pairBId = await ctx.db.insert('pairs', { tournamentId, participantAId: participants[b[0]], participantBId: participants[b[1]] })
      return ctx.db.insert('matches', { roundId, pairAId, pairBId, courtNumber: 1, state: 'scheduled' })
    })
  }
  async function scoreFixtures() {
    const results = [[0, 2, 10, 9], [0, 3, 10, 9], [1, 2, 10, 11], [1, 3, 10, 0]]
    const matchIds = []
    for (const [a, b, scoreA, scoreB] of results) {
      const matchId = await addMatch([a, b], [4, 5])
      await organizer.mutation(api.scores.saveResult, { matchId, scoreA, scoreB })
      matchIds.push(matchId)
    }
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    return matchIds
  }
  return { t, organizer, tournamentId, participants, addMatch, scoreFixtures, ...data }
}

describe('tournament tiebreak settings', () => {
  test('stores defaults on create and preserves a chosen order when duplicating', async () => {
    const { t, organizer, tournamentId } = await setup()
    expect(await t.query(api.tournaments.get, { tournamentId })).toMatchObject({ tiebreakOrder: ['wins', 'point_diff', 'head_to_head'] })
    await organizer.mutation(api.tournaments.update, { tournamentId, tiebreakOrder: ['head_to_head', 'point_diff', 'wins'] })
    const copy = await organizer.mutation(api.tournaments.duplicate, { tournamentId })
    expect(await t.query(api.tournaments.get, { tournamentId: copy })).toMatchObject({ tiebreakOrder: ['head_to_head', 'point_diff', 'wins'] })
  })

  test('rejects missing or repeated criteria', async () => {
    const { organizer, tournamentId } = await setup()
    await expect(organizer.mutation(api.tournaments.update, { tournamentId, tiebreakOrder: ['wins', 'wins', 'point_diff'] })).rejects.toThrow('exactly once')
    await expect(organizer.mutation(api.tournaments.update, { tournamentId, tiebreakOrder: [] })).rejects.toThrow('exactly once')
  })

  test('requires membership in the tournament organisation', async () => {
    const { t, tournamentId } = await setup()
    const args = { tournamentId, tiebreakOrder: ['point_diff', 'wins', 'head_to_head'] as ('point_diff' | 'wins' | 'head_to_head')[] }
    await expect(t.mutation(api.tournaments.update, args)).rejects.toThrow('Not authenticated')
    const outsider = t.withIdentity({ tokenIdentifier: 'outsider', org_id: 'another-club', org_role: 'org:admin' })
    await expect(outsider.mutation(api.tournaments.update, args)).rejects.toThrow('Not a member')
  })

  test('locks the order after completion while allowing unrelated edits', async () => {
    const { t, organizer, tournamentId } = await setup()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed' }))
    await expect(organizer.mutation(api.tournaments.update, { tournamentId, tiebreakOrder: ['point_diff', 'wins', 'head_to_head'] })).rejects.toThrow('completed')
    await organizer.mutation(api.tournaments.update, { tournamentId, name: 'Renamed', tiebreakOrder: ['wins', 'point_diff', 'head_to_head'] })
    expect(await t.query(api.tournaments.get, { tournamentId })).toMatchObject({ name: 'Renamed' })
  })
})

describe('Americano standings and ratings', () => {
  test('uses the saved order and current match results across standings and rating awards', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, scoreFixtures } = await setup()
    await scoreFixtures()
    const standings = await t.query(api.leaderboard.get, { tournamentId })
    expect(standings.map(row => row.players[0].displayName)).toEqual(['E', 'F', 'D', 'A', 'B', 'C'])
    expect(standings.map(row => row.rank)).toEqual([1, 1, 3, 4, 5, 6])
    expect(standings.find(row => row.players[0].displayName === 'A')).toMatchObject({ pointDiff: 2, wins: 2, played: 2 })

    await organizer.mutation(api.tournaments.update, { tournamentId, tiebreakOrder: ['point_diff', 'wins', 'head_to_head'] })
    expect((await t.query(api.leaderboard.get, { tournamentId })).map(row => row.players[0].displayName))
      .toEqual(['E', 'F', 'D', 'B', 'A', 'C'])
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed' }))
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    const awards = await t.run(async ctx => {
      const history = await ctx.db.query('ratingHistory').withIndex('by_tournament', q => q.eq('tournamentId', tournamentId)).collect()
      return Promise.all(history.map(async row => ({ name: (await ctx.db.get(row.memberId!))!.name, placement: row.placement, points: row.pointsEarned })))
    })
    expect(awards).toEqual(expect.arrayContaining([
      { name: 'E', placement: 1, points: 9 }, { name: 'F', placement: 1, points: 9 },
      { name: 'B', placement: 4, points: 4 }, { name: 'A', placement: 5, points: 3 },
    ]))
  })

  test('re-scoring updates rankings and awarded ratings without counting the tournament twice', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, scoreFixtures } = await setup()
    const matchIds = await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed' }))
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    await organizer.mutation(api.scores.saveResult, { matchId: matchIds[3], scoreA: 20, scoreB: 0 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const standings = await t.query(api.leaderboard.get, { tournamentId })
    expect(standings.slice(0, 2).map(row => row.players[0].displayName)).toEqual(['D', 'B'])
    const awards = await t.run(async ctx => {
      const history = await ctx.db.query('ratingHistory').withIndex('by_tournament', q => q.eq('tournamentId', tournamentId)).collect()
      return Promise.all(history.map(async row => ({ ...row, member: await ctx.db.get(row.memberId!) })))
    })
    expect(awards).toHaveLength(6)
    expect(awards.find(row => row.member?.name === 'B')).toMatchObject({ placement: 2, pointsEarned: 8, member: { startingPoints: 8, tournamentsPlayed: 1 } })
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    expect(await t.run(async ctx => ctx.db.query('ratingHistory').withIndex('by_tournament', q => q.eq('tournamentId', tournamentId)).collect())).toHaveLength(6)
  })

  test('a drawn match gives neither side a win or loss and shares their rank', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, addMatch } = await setup()
    const matchId = await addMatch([0, 1], [2, 3])
    await organizer.mutation(api.scores.saveResult, { matchId, scoreA: 10, scoreB: 10 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const standings = await t.query(api.leaderboard.get, { tournamentId })
    expect(standings).toHaveLength(4)
    for (const row of standings) expect(row).toMatchObject({ points: 10, wins: 0, losses: 0, played: 1, pointDiff: 0, rank: 1, tied: true })
  })

  test('score corrections retain the rating tiers used when the tournament finished', async () => {
    vi.useFakeTimers()
    const { t, organizer, organizationId, tournamentId, scoreFixtures } = await setup()
    await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed' }))
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    await organizer.mutation(api.ratings.setTiers, { organizationId, tiers: [100, 80, 60, 40, 30, 20] })
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    const awards = await t.run(async ctx => ctx.db.query('ratingHistory').withIndex('by_tournament', q => q.eq('tournamentId', tournamentId)).collect())
    expect(awards.map(award => award.pointsEarned).sort((a, b) => b - a)).toEqual([9, 9, 6, 4, 3, 2])
  })

  test('score corrections follow a member who links an account after the tournament', async () => {
    vi.useFakeTimers()
    const { t, organizer, organizationId, participants, tournamentId, scoreFixtures } = await setup()
    const matchIds = await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed' }))
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    const { memberId, userId } = await t.run(async ctx => ({
      memberId: (await ctx.db.get(participants[1]))!.memberId!,
      userId: await ctx.db.insert('users', { clerkUserId: 'linked', name: 'B', email: 'b@example.test' }),
    }))
    await organizer.mutation(api.members.link, { memberId, userId })
    await organizer.mutation(api.scores.saveResult, { matchId: matchIds[3], scoreA: 20, scoreB: 0 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const rating = await t.run(async ctx => ctx.db.query('playerRatings')
      .withIndex('by_organization_and_user', q => q.eq('organizationId', organizationId).eq('userId', userId)).unique())
    expect(rating).toMatchObject({ totalPoints: 8, tournamentsPlayed: 1 })
  })

  test('approved and admin-resolved scores persist the final match scores', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, participants, addMatch } = await setup()
    const matchId = await addMatch([0, 1], [2, 3])
    await organizer.mutation(api.scores.submit, { matchId, submittedBy: participants[0], scoreA: 10, scoreB: 8 })
    await organizer.mutation(api.scores.submit, { matchId, submittedBy: participants[2], scoreA: 10, scoreB: 8 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(async ctx => ctx.db.get(matchId))).toMatchObject({ state: 'completed', scoreA: 10, scoreB: 8 })
    await organizer.mutation(api.scores.resolve, { matchId, scoreA: 8, scoreB: 10 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(async ctx => ctx.db.get(matchId))).toMatchObject({ scoreA: 8, scoreB: 10 })
    const standings = await t.query(api.leaderboard.get, { tournamentId })
    expect(standings.find(row => row.players[0].displayName === 'A')).toMatchObject({ points: 8, wins: 0, losses: 1, pointDiff: -2 })
  })

  test('repeated awards remain stable when two entries refer to the same member', async () => {
    vi.useFakeTimers()
    const { t, tournamentId, participants, scoreFixtures } = await setup()
    await scoreFixtures()
    await t.run(async ctx => {
      const first = (await ctx.db.get(participants[0]))!
      await ctx.db.patch(participants[1], { memberId: first.memberId })
      await ctx.db.patch(tournamentId, { state: 'completed' })
    })
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    const before = await t.run(async ctx => ctx.db.query('members').collect())
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    expect(await t.run(async ctx => ctx.db.query('members').collect())).toEqual(before)
  })

  test('does not mistake approved submissions for an older admin-resolved result', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, participants, scoreFixtures } = await setup()
    const matchIds = await scoreFixtures()
    await t.run(async ctx => {
      await ctx.db.patch(matchIds[3], { scoreA: undefined, scoreB: undefined })
      await ctx.db.insert('scores', { matchId: matchIds[3], submittedBy: participants[1], scoreA: 0, scoreB: 10, state: 'approved' })
    })
    expect((await t.query(api.leaderboard.get, { tournamentId })).find(row => row.participantId === participants[1]))
      .toMatchObject({ points: 20, pointDiff: null, tiebreaksUnavailable: true })
    await expect(organizer.mutation(api.scores.saveResult, { matchId: matchIds[3], scoreA: 20, scoreB: 0 }))
      .rejects.toThrow('original result is unavailable')
    const cached = await t.run(async ctx => ctx.db.query('leaderboard')
      .withIndex('by_tournament_and_participant', q => q.eq('tournamentId', tournamentId).eq('participantId', participants[1])).unique())
    expect(cached).toMatchObject({ points: 20, wins: 1, losses: 1 })
  })

  test('preserves cached totals when an older result cannot be recovered', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, participants, scoreFixtures } = await setup()
    const matchIds = await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(matchIds[3], { scoreA: undefined, scoreB: undefined }))
    expect((await t.query(api.leaderboard.get, { tournamentId })).find(row => row.participantId === participants[1]))
      .toMatchObject({ points: 20, pointDiff: null, rank: 3, tiebreaksUnavailable: true })
    await expect(organizer.mutation(api.scores.saveResult, { matchId: matchIds[3], scoreA: 20, scoreB: 0 }))
      .rejects.toThrow('original result is unavailable')
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    expect(await t.run(async ctx => ctx.db.query('ratingHistory').collect())).toHaveLength(0)
  })

  test('completed legacy events keep points-only ranks and awards, even after reopening', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, scoreFixtures } = await setup()
    await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed', tiebreakOrder: undefined }))
    const standings = await t.query(api.leaderboard.get, { tournamentId })
    expect(standings.map(row => row.rank)).toEqual([1, 1, 3, 3, 3, 3])
    expect(standings.every(row => row.pointDiff === null)).toBe(true)
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    const before = await t.run(async ctx => ctx.db.query('ratingHistory').collect())
    await t.run(async ctx => ctx.db.patch(tournamentId, { awardedRatingTiers: undefined }))
    await organizer.mutation(api.tournaments.updateState, { tournamentId, state: 'in_progress' })
    await expect(organizer.mutation(api.tournaments.update, { tournamentId, tiebreakOrder: ['wins', 'point_diff', 'head_to_head'] }))
      .rejects.toThrow('completed')
    await organizer.mutation(api.tournaments.update, { tournamentId, name: 'Renamed' })
    await organizer.mutation(api.tournaments.finish, { tournamentId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(async ctx => ctx.db.query('ratingHistory').collect())).toEqual(before)
  })

  test('reopening a historical event without rating history preserves points-only standings', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, scoreFixtures } = await setup()
    await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'completed', tiebreakOrder: undefined }))
    await organizer.mutation(api.tournaments.updateState, { tournamentId, state: 'in_progress' })
    expect(await t.query(api.tournaments.get, { tournamentId })).toMatchObject({ tiebreakOrderLocked: true })
    expect((await t.query(api.leaderboard.get, { tournamentId })).map(row => row.rank)).toEqual([1, 1, 3, 3, 3, 3])
  })

  test('finishing an older active event pins the default order before rating awards', async () => {
    vi.useFakeTimers()
    const { t, organizer, tournamentId, scoreFixtures } = await setup()
    await scoreFixtures()
    await t.run(async ctx => ctx.db.patch(tournamentId, { state: 'in_progress', tiebreakOrder: undefined }))
    await organizer.mutation(api.tournaments.finish, { tournamentId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.query(api.tournaments.get, { tournamentId })).toMatchObject({ tiebreakOrder: ['wins', 'point_diff', 'head_to_head'] })
    expect((await t.query(api.leaderboard.get, { tournamentId })).map(row => row.rank)).toEqual([1, 1, 3, 4, 5, 6])
  })

  test('fixed pairs remain a single placement unit with points-only tie averaging', async () => {
    const { t, tournamentId, participants } = await setup()
    await t.run(async ctx => {
      await ctx.db.patch(tournamentId, { format: 'round_robin', state: 'completed', tiebreakOrder: undefined })
      for (let i = 0; i < 3; i++) {
        const teamId = await ctx.db.insert('teams', { tournamentId, name: `Team ${i}` })
        for (const participantId of participants.slice(i * 2, i * 2 + 2)) {
          await ctx.db.patch(participantId, { teamId })
          await ctx.db.insert('leaderboard', { tournamentId, participantId, points: i < 2 ? 10 : 5, wins: 1, losses: 0 })
        }
      }
    })
    const standings = await t.query(api.leaderboard.get, { tournamentId })
    expect(standings.map(row => [row.rank, row.players.length, row.pointDiff])).toEqual([[1, 2, null], [1, 2, null], [3, 2, null]])
    await t.mutation(internal.ratings.awardRatings, { tournamentId })
    const awards = await t.run(async ctx => ctx.db.query('ratingHistory').collect())
    expect(awards.map(row => row.pointsEarned).sort((a, b) => b - a)).toEqual([9, 9, 9, 9, 6, 6])
  })
})
