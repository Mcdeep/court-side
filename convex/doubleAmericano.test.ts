/// <reference types="vite/client" />
import { expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api, internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob(['./**/*.ts', './_generated/*.js', '!./**/*.test.ts'])
async function setup(count = 16, courtCount = 4) {
  const t = convexTest(schema, modules)
  const data = await t.run(async ctx => {
    const organizationId = await ctx.db.insert('organizations', {clerkOrgId:'club',name:'Club',slug:'club',status:'active'})
    const venueId = await ctx.db.insert('venues',{organizationId,name:'Courts',courtCount})
    await ctx.db.insert('users',{clerkUserId:'organizer',name:'Organizer',email:'org@example.test'})
    const tournamentId = await ctx.db.insert('tournaments',{organizationId,venueId,name:'Double',format:'americano',americanoVariant:'double',state:'registration_open',courtCount,startsAt:0,endsAt:1000,tiebreakOrder:['wins','points','point_diff','head_to_head']})
    const participants = []
    for(let i=0;i<count;i++) {
      const memberId = await ctx.db.insert('members',{organizationId,name:String(i),skillRating:1+i*0.25})
      participants.push(await ctx.db.insert('participants',{tournamentId,memberId,walkInName:String(i),isWalkIn:true,entryType:'solo',skillRating:1}))
    }
    return {organizationId,venueId,tournamentId,participants}
  })
  const organizer=t.withIdentity({tokenIdentifier:'organizer',org_id:'club',org_role:'org:admin'})
  return {t,organizer,...data}
}

test('rated split uses current member ratings and preserves two groups of eight',async()=>{
  const {t,organizer,tournamentId,participants}=await setup()
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'top_bottom'})
  const players=await t.query(api.participants.list,{tournamentId})
  expect(players.filter(p=>p.group===1).map(p=>p._id)).toEqual(participants.slice(8))
  expect(players.filter(p=>p.group===2)).toHaveLength(8)
  expect(players[15].rating).toBe(4.75)
})

test('group assignment requires admin, sixteen players and all ratings for rated modes',async()=>{
  const {t,organizer,tournamentId,participants}=await setup()
  await expect(t.mutation(api.participants.assignGroups,{tournamentId,mode:'random'})).rejects.toThrow()
  await t.run(async ctx=>{const p=await ctx.db.get(participants[0]);await ctx.db.patch(p!.memberId!,{skillRating:undefined})})
  await expect(organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'balanced'})).rejects.toThrow(/rating/i)
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'random'})
  const short=await setup(15)
  await expect(short.organizer.mutation(api.participants.assignGroups,{tournamentId:short.tournamentId,mode:'random'})).rejects.toThrow(/16/)
})

test('group phase reuses seven rounds and locks assignment and swaps after generation',async()=>{
  const {t,organizer,tournamentId,participants}=await setup()
  await expect(organizer.action(api.rounds.generate,{tournamentId})).rejects.toThrow(/group/i)
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'top_bottom'})
  await organizer.mutation(api.participants.swapGroups,{tournamentId,participantAId:participants[0],participantBId:participants[8]})
  expect(await organizer.action(api.rounds.generate,{tournamentId})).toBe(7)
  const rounds=await t.query(api.rounds.list,{tournamentId})
  expect(rounds.every(r=>r.stage==='group')).toBe(true)
  expect(await t.query(api.matches.listByRound,{roundId:rounds[0]._id})).toHaveLength(4)
  await expect(organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'balanced'})).rejects.toThrow(/generated/i)
  await expect(organizer.mutation(api.participants.swapGroups,{tournamentId,participantAId:participants[0],participantBId:participants[8]})).rejects.toThrow(/generated/i)
  await expect(organizer.action(api.rounds.generate,{tournamentId})).rejects.toThrow(/Complete/i)
  await expect(organizer.mutation(api.tournaments.finish,{tournamentId})).rejects.toThrow(/final/i)
})

async function completedGroups(courtCount = 4) {
  const fixture = await setup(16, courtCount)
  const {t,organizer,tournamentId} = fixture
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'top_bottom'})
  await organizer.action(api.rounds.generate,{tournamentId})
  const rounds = await t.query(api.rounds.list,{tournamentId})
  await t.run(async ctx=>{
    for(const round of rounds) {
      const matches=await ctx.db.query('matches').withIndex('by_round',q=>q.eq('roundId',round._id)).collect()
      for(const match of matches) await ctx.db.patch(match._id,{state:'completed',scoreA:10,scoreB:8})
      await ctx.db.patch(round._id,{state:'completed'})
    }
  })
  return fixture
}

test('final seeding follows each group ranking and randomises only remaining ties',async()=>{
  const {t,organizer,tournamentId} = await completedGroups()
  const before = await t.query(api.leaderboard.get,{tournamentId})
  const prepared = await organizer.query(internal.rounds.prepareGeneration,{tournamentId})
  expect(prepared.inputs.kind).toBe('double_final')
  if(prepared.inputs.kind !== 'double_final') throw new Error('Expected final')
  for(const [group,seeds] of [[1,prepared.inputs.group1],[2,prepared.inputs.group2]] as const) {
    expect(seeds).toEqual(before.filter(row=>row.group===group).map(row=>({id:row.participantId,rank:row.rank})))
  }
  expect(await organizer.action(api.rounds.generate,{tournamentId})).toBe(1)
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const final=rounds[7]
  expect(final).toMatchObject({roundNumber:8,stage:'final'})
  const matches=await t.query(api.matches.listByRound,{roundId:final._id})
  const ranks=new Map(before.map(row=>[row.participantId,row.rank]))
  const groups=new Map(before.map(row=>[row.participantId,row.group]))
  const ordered=new Map<number,string[]>()
  for(const match of matches) {
    const pairs=await t.run(async ctx=>[await ctx.db.get(match.pairAId),await ctx.db.get(match.pairBId)])
    const [a,b]=pairs
    expect(groups.get(a!.participantAId)).toBe(1)
    expect(groups.get(a!.participantBId)).toBe(2)
    expect(groups.get(b!.participantAId)).toBe(2)
    expect(groups.get(b!.participantBId)).toBe(1)
    ordered.set(match.finalMatchIndex!,[a!.participantAId,b!.participantBId,b!.participantAId,a!.participantBId])
  }
  const first=[...ordered.entries()].sort(([a],[b])=>a-b).flatMap(([,ids])=>ids.slice(0,2))
  expect(first.map(id=>ranks.get(id as typeof before[number]['participantId']))).toEqual(prepared.inputs.group1.map(seed=>seed.rank))
  await expect(organizer.action(api.rounds.generate,{tournamentId})).rejects.toThrow(/already generated/i)
})

test('final plan is rejected after any group score correction',async()=>{
  const {t,organizer,tournamentId}=await completedGroups()
  const prepared=await organizer.query(internal.rounds.prepareGeneration,{tournamentId})
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const matches=await t.query(api.matches.listByRound,{roundId:rounds[0]._id})
  await t.run(ctx=>ctx.db.patch(matches[0]._id,{scoreA:11}))
  await expect(organizer.mutation(internal.rounds.commitRoundPlans,{tournamentId,snapshot:prepared.snapshot,roundPlans:[]})).rejects.toThrow(/changed/i)
  expect(await t.query(api.rounds.list,{tournamentId})).toHaveLength(7)
})

test.each([2,4])('final results on %i courts set shared placements and averaged awards without changing group totals',async courtCount=>{
  const {t,organizer,tournamentId,organizationId}=await completedGroups(courtCount)
  const groupStats=await t.query(api.leaderboard.get,{tournamentId})
  await organizer.action(api.rounds.generate,{tournamentId})
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const finals=rounds.filter(round=>round.stage==='final')
  expect(finals).toHaveLength(courtCount===2?2:1)
  const winners=new Map<string,number>()
  for(const round of finals) {
    const matches=await t.query(api.matches.listByRound,{roundId:round._id})
    for(const match of matches) {
      await expect(organizer.mutation(api.scores.saveResult,{matchId:match._id,scoreA:12,scoreB:12})).rejects.toThrow(/winner/i)
      await organizer.mutation(api.scores.saveResult,{matchId:match._id,scoreA:24,scoreB:0})
      const pair=await t.run(ctx=>ctx.db.get(match.pairAId))
      for(const id of [pair!.participantAId,pair!.participantBId]) winners.set(id,match.finalMatchIndex!*2+1)
    }
    await t.run(ctx=>ctx.db.patch(round._id,{state:'completed'}))
  }
  const results=await t.query(api.leaderboard.get,{tournamentId})
  expect(results.map(row=>row.rank)).toEqual([1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8])
  for(const row of results) {
    const before=groupStats.find(p=>p.participantId===row.participantId)!
    expect([row.points,row.wins,row.losses,row.played,row.groupRank]).toEqual([before.points,before.wins,before.losses,before.played,before.rank])
    if(winners.has(row.participantId)) expect(row.finalPlacement).toBe(winners.get(row.participantId))
  }
  await t.run(ctx=>ctx.db.insert('ratingConfig',{organizationId,tiers:[100,80,60,40,30,20,10,0]}))
  await organizer.mutation(api.tournaments.finish,{tournamentId})
  await t.mutation(internal.ratings.awardRatings,{tournamentId})
  const awards=await t.run(ctx=>ctx.db.query('ratingHistory').withIndex('by_tournament',q=>q.eq('tournamentId',tournamentId)).collect())
  expect(awards).toHaveLength(16)
  expect(awards.filter(row=>row.placement===1).map(row=>row.pointsEarned)).toEqual([90,90])
  expect(awards.filter(row=>row.placement===2).map(row=>row.pointsEarned)).toEqual([50,50])
})

test('group swaps reject foreign and same-group players without changing assignments',async()=>{
  const {t,organizer,tournamentId,participants}=await setup()
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'top_bottom'})
  const foreignId=await t.run(async ctx=>{
    const original=await ctx.db.get(tournamentId)
    const other=await ctx.db.insert('tournaments',{organizationId:original!.organizationId,venueId:original!.venueId,name:'Other',format:'americano',state:'draft',startsAt:0,endsAt:100})
    return ctx.db.insert('participants',{tournamentId:other,isWalkIn:true,walkInName:'Foreign',entryType:'solo',group:1})
  })
  for(const participantBId of [participants[1],foreignId]) await expect(organizer.mutation(api.participants.swapGroups,{tournamentId,participantAId:participants[0],participantBId})).rejects.toThrow(/each group/i)
  expect((await t.query(api.participants.list,{tournamentId})).filter(p=>p.group===1).map(p=>p._id)).toEqual(participants.slice(8))
})

test('variant creation validates format and courts and duplicate retains double settings',async()=>{
  const {t,organizer,tournamentId,organizationId,venueId}=await setup()
  const args={organizationId,venueId,name:'New',format:'americano' as const,americanoVariant:'double' as const,groupSplitMode:'balanced' as const,courtCount:4,startsAt:0,endsAt:100}
  await expect(organizer.mutation(api.tournaments.create,{...args,format:'mexicano'})).rejects.toThrow(/Americano/)
  await expect(organizer.mutation(api.tournaments.create,{...args,courtCount:1})).rejects.toThrow(/two courts/)
  const created=await organizer.mutation(api.tournaments.create,args)
  expect(await t.query(api.tournaments.get,{tournamentId:created})).toMatchObject({americanoVariant:'double',groupSplitMode:'balanced'})
  const copy=await organizer.mutation(api.tournaments.duplicate,{tournamentId:created})
  expect(await t.query(api.tournaments.get,{tournamentId:copy})).toMatchObject({americanoVariant:'double',groupSplitMode:'balanced',state:'draft'})
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'balanced'})
  await organizer.mutation(api.tournaments.update,{tournamentId,americanoVariant:'single'})
  expect((await t.query(api.participants.list,{tournamentId})).every(p=>p.group===undefined)).toBe(true)
})

test('finals require every group score and freeze the configured ranking order',async()=>{
  const {t,organizer,tournamentId}=await completedGroups()
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const matches=await t.query(api.matches.listByRound,{roundId:rounds[0]._id})
  await t.run(ctx=>ctx.db.patch(matches[0]._id,{scoreA:undefined}))
  await expect(organizer.action(api.rounds.generate,{tournamentId})).rejects.toThrow(/group scores/)
  await expect(organizer.mutation(api.tournaments.updateState,{tournamentId,state:'completed'})).rejects.toThrow(/final/)
  await t.run(ctx=>ctx.db.patch(matches[0]._id,{scoreA:10}))
  await organizer.action(api.rounds.generate,{tournamentId})
  await expect(organizer.mutation(api.tournaments.update,{tournamentId,tiebreakOrder:['points','wins','point_diff','head_to_head']})).rejects.toThrow(/Cannot change/)
})

test('final corrections reconcile shared rating awards exactly once',async()=>{
  const {t,organizer,tournamentId,organizationId}=await completedGroups()
  await organizer.action(api.rounds.generate,{tournamentId})
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const final=rounds[7]
  const matches=await t.query(api.matches.listByRound,{roundId:final._id})
  for(const match of matches) await organizer.mutation(api.scores.saveResult,{matchId:match._id,scoreA:24,scoreB:0})
  await t.run(async ctx=>{
    await ctx.db.patch(final._id,{state:'completed'})
    await ctx.db.insert('ratingConfig',{organizationId,tiers:[100,80,60,40]})
  })
  await organizer.mutation(api.tournaments.finish,{tournamentId})
  await t.mutation(internal.ratings.awardRatings,{tournamentId})
  await organizer.mutation(api.scores.saveResult,{matchId:matches[0]._id,scoreA:0,scoreB:24})
  await t.mutation(internal.ratings.awardRatings,{tournamentId})
  await t.mutation(internal.ratings.awardRatings,{tournamentId})
  const pairA=await t.run(ctx=>ctx.db.get(matches[0].pairAId))
  const history=await t.run(ctx=>ctx.db.query('ratingHistory').withIndex('by_tournament',q=>q.eq('tournamentId',tournamentId)).collect())
  expect(history).toHaveLength(16)
  for(const id of [pairA!.participantAId,pairA!.participantBId]) {
    const award=history.find(row=>row.participantId===id)!
    expect(award).toMatchObject({placement:2,pointsEarned:50})
    expect(await t.run(ctx=>ctx.db.get(award.memberId!))).toMatchObject({startingPoints:50,tournamentsPlayed:1})
  }
})

test('group corrections require resetting finals and keep the group schedule and totals',async()=>{
  const {t,organizer,tournamentId}=await completedGroups()
  await organizer.action(api.rounds.generate,{tournamentId})
  const before=await t.query(api.rounds.list,{tournamentId})
  const groups=await t.query(api.matches.listByRound,{roundId:before[0]._id})
  const final=await t.query(api.matches.listByRound,{roundId:before[7]._id})
  await organizer.mutation(api.scores.saveResult,{matchId:final[0]._id,scoreA:24,scoreB:10})
  await expect(organizer.mutation(api.scores.saveResult,{matchId:groups[0]._id,scoreA:11,scoreB:8})).rejects.toThrow(/Reset.*final/i)
  await expect(organizer.mutation(api.scores.resolve,{matchId:groups[0]._id,scoreA:11,scoreB:8})).rejects.toThrow(/Reset.*final/i)
  await expect(organizer.mutation(api.matches.updateState,{matchId:groups[0]._id,state:'disputed'})).rejects.toThrow(/Reset.*final/i)
  await expect(t.mutation(api.rounds.resetFinals,{tournamentId})).rejects.toThrow()
  await organizer.mutation(api.rounds.resetFinals,{tournamentId})
  expect(await t.query(api.rounds.list,{tournamentId})).toEqual(before.slice(0,7))
  expect(await t.run(ctx=>ctx.db.get(final[0]._id))).toBeNull()
  expect(await t.query(api.tournaments.get,{tournamentId})).toMatchObject({tiebreakOrderLocked:false})
  await organizer.mutation(api.scores.saveResult,{matchId:groups[0]._id,scoreA:11,scoreB:8})
  expect(await organizer.action(api.rounds.generate,{tournamentId})).toBe(1)
})

test('changing group assignments invalidates an in-flight group schedule',async()=>{
  const {organizer,tournamentId,participants}=await setup()
  await organizer.mutation(api.participants.assignGroups,{tournamentId,mode:'top_bottom'})
  const prepared=await organizer.query(internal.rounds.prepareGeneration,{tournamentId})
  await organizer.mutation(api.participants.swapGroups,{tournamentId,participantAId:participants[0],participantBId:participants[8]})
  await expect(organizer.mutation(internal.rounds.commitRoundPlans,{tournamentId,snapshot:prepared.snapshot,roundPlans:[]})).rejects.toThrow(/changed/i)
})

test('all final scoring paths reject a draw',async()=>{
  const {t,organizer,tournamentId,participants}=await completedGroups()
  await organizer.action(api.rounds.generate,{tournamentId})
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const matches=await t.query(api.matches.listByRound,{roundId:rounds[7]._id})
  const args={matchId:matches[0]._id,scoreA:12,scoreB:12}
  await expect(organizer.mutation(api.scores.submit,{...args,submittedBy:participants[0]})).rejects.toThrow(/winner/i)
  await expect(organizer.mutation(api.scores.resolve,args)).rejects.toThrow(/winner/i)
  await expect(organizer.mutation(api.scores.saveResult,args)).rejects.toThrow(/winner/i)
})

test('final reset is refused after awards even if an administrator reopens the tournament',async()=>{
  const {t,organizer,tournamentId}=await completedGroups()
  await organizer.action(api.rounds.generate,{tournamentId})
  const rounds=await t.query(api.rounds.list,{tournamentId})
  const matches=await t.query(api.matches.listByRound,{roundId:rounds[7]._id})
  for(const match of matches) await organizer.mutation(api.scores.saveResult,{matchId:match._id,scoreA:24,scoreB:16})
  await t.run(ctx=>ctx.db.patch(rounds[7]._id,{state:'completed'}))
  await organizer.mutation(api.tournaments.finish,{tournamentId})
  await t.mutation(internal.ratings.awardRatings,{tournamentId})
  await expect(organizer.mutation(api.rounds.resetFinals,{tournamentId})).rejects.toThrow(/finished/i)
  await organizer.mutation(api.tournaments.updateState,{tournamentId,state:'in_progress'})
  await expect(organizer.mutation(api.rounds.resetFinals,{tournamentId})).rejects.toThrow(/finished/i)
})

test('roster ratings follow accounts linked after tournament registration',async()=>{
  const {t,organizer,tournamentId,participants,organizationId}=await setup()
  const userId=await t.run(async ctx=>{
    const p=await ctx.db.get(participants[0])
    const id=await ctx.db.insert('users',{clerkUserId:'newly-linked',name:'Linked player',email:'linked@example.test'})
    await ctx.db.patch(p!.memberId!,{userId:id})
    return id
  })
  await organizer.mutation(api.ratings.setSkillRating,{organizationId,userId,skillRating:6.5})
  const players=await t.query(api.participants.list,{tournamentId})
  expect(players.find(p=>p._id===participants[0])).toMatchObject({rating:6.5,resolvedUserId:userId,user:{name:'Linked player'}})
})
